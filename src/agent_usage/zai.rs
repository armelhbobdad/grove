//! z.ai (GLM) usage quota fetcher.
//!
//! Token resolution order (mirrors the reference):
//!   1. `ZAI_API_KEY` / `GLM_API_KEY` env vars
//!   2. OpenCode auth.json `zai-coding-plan` entry
//!
//! We do NOT spawn a login shell to probe RC files — grove's server inherits
//! env from its own shell.
//!
//! Calls `https://api.z.ai/api/monitor/usage/quota/limit`. The response is a
//! Chinese-style wrapper with `{code, msg, success, data}`; we require
//! `code == 200 && success == true`. `data.limits[]` may contain
//! `TOKENS_LIMIT` and/or `TIME_LIMIT` entries — we expose both.

use super::{clamp_percent, AgentUsage, ExtraInfo, UsageWindow, HTTP_TIMEOUT_ZAI};
use serde::Deserialize;

const USAGE_URL: &str = "https://api.z.ai/api/monitor/usage/quota/limit";
pub(super) const OPENCODE_KEY: &str = "zai-coding-plan";

#[derive(Debug, Deserialize)]
struct LimitEntry {
    #[serde(rename = "type")]
    entry_type: Option<String>,
    unit: Option<u32>,
    number: Option<u32>,
    #[serde(default)]
    usage: Option<f64>,
    #[allow(dead_code)]
    #[serde(rename = "currentValue", default)]
    current_value: Option<f64>,
    #[serde(default)]
    remaining: Option<f64>,
    #[serde(default)]
    percentage: Option<f64>,
    #[serde(rename = "nextResetTime", default)]
    next_reset_time: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct DataBlock {
    limits: Option<Vec<LimitEntry>>,
    #[serde(rename = "planName")]
    plan_name: Option<String>,
    plan: Option<String>,
    #[serde(rename = "plan_type")]
    plan_type: Option<String>,
    #[serde(rename = "packageName")]
    package_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ZaiResponse {
    code: Option<i64>,
    msg: Option<String>,
    success: Option<bool>,
    data: Option<DataBlock>,
}

pub(super) fn resolve_token() -> Option<String> {
    for var in ["ZAI_API_KEY", "GLM_API_KEY"] {
        if let Ok(v) = std::env::var(var) {
            let t = v.trim();
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
    }
    super::opencode_auth::read_opencode_token(OPENCODE_KEY)
}

pub(super) fn fetch_with_token(token: &str) -> Result<AgentUsage, String> {
    let agent = ureq::AgentBuilder::new().timeout(HTTP_TIMEOUT_ZAI).build();
    let resp = agent
        .get(USAGE_URL)
        .set("Authorization", &format!("Bearer {}", token.trim()))
        .set("Accept", "application/json")
        .call()
        .map_err(|e| format!("usage api call failed: {}", e))?;
    let body: ZaiResponse = resp
        .into_json()
        .map_err(|e| format!("parse usage response: {}", e))?;

    if body.success != Some(true) || body.code != Some(200) {
        return Err(format!(
            "api error: {}",
            body.msg.unwrap_or_else(|| "unknown".into())
        ));
    }

    let data = body.data.ok_or("missing data block")?;
    let limits = data.limits.ok_or("missing limits array")?;

    let mut usage = AgentUsage::new("zai");
    let plan = data
        .plan_name
        .or(data.plan)
        .or(data.plan_type)
        .or(data.package_name);
    usage.plan = Some(
        format!("Zai {}", plan.as_deref().unwrap_or("").trim())
            .trim()
            .to_string(),
    );

    for entry in limits {
        let label = match entry.entry_type.as_deref() {
            Some("TOKENS_LIMIT") => "Tokens",
            Some("TIME_LIMIT") => "Calls",
            _ => continue,
        };
        // Compute structured window length AND a human-readable suffix.
        // unit=2 (weeks) is rendered as "N×7 days" per user request.
        // unit=4 is months in z.ai's API; approximate as 30 days for the
        // safe-guard line. Unknown units yield `secs_per_unit = 0` so the
        // frontend skips the safe-guard line — surfacing the bar without a
        // bogus pace mark is safer than guessing the window length.
        let num = entry.number.unwrap_or(0);
        let (display_num, display_unit, secs_per_unit): (u32, &str, i64) =
            match entry.unit.unwrap_or(0) {
                1 => (num, "days", 86400),
                2 => (num.saturating_mul(7), "days", 86400),
                3 => (num, "hours", 3600),
                4 => (num.saturating_mul(30), "days", 86400),
                5 => (num, "minutes", 60),
                _ => (num, "units", 0),
            };
        let total_window_seconds = if secs_per_unit > 0 && display_num > 0 {
            Some(i64::from(display_num) * secs_per_unit)
        } else {
            None
        };
        let window_desc = format!("{} {}", display_num, display_unit);
        // API convention: `percentage` is used %, so remaining = 100 - percentage.
        let pct_used = entry.percentage.unwrap_or(0.0);
        let pct_remaining = clamp_percent((100.0 - pct_used) as f32);
        let resets_at = entry
            .next_reset_time
            .and_then(chrono::DateTime::from_timestamp_millis)
            .map(|dt| dt.to_rfc3339());
        let resets_in_seconds = resets_at
            .as_deref()
            .and_then(super::iso_to_seconds_remaining);

        let window_label = format!("{} ({})", label, window_desc);
        usage.windows.push(UsageWindow {
            label: window_label.clone(),
            percentage_remaining: pct_remaining,
            resets_at,
            resets_in_seconds,
            total_window_seconds,
        });

        // Use the full window label as the extras key so multiple TOKENS_LIMIT
        // entries (e.g. 5h + weekly) don't collide on a shared "Tokens" label.
        // Push whenever any of usage / currentValue / remaining is present.
        let used = entry.usage.or(entry.current_value);
        let remaining = entry.remaining;
        if used.is_some() || remaining.is_some() {
            let used_str = used
                .map(|n| format!("{}", n as i64))
                .unwrap_or_else(|| "?".into());
            let remaining_str = remaining
                .map(|n| format!("{}", n as i64))
                .unwrap_or_else(|| "?".into());
            usage.extras.push(ExtraInfo {
                label: window_label,
                value: format!("{} used / {} left", used_str, remaining_str),
            });
        }
    }

    usage.finalize().ok_or_else(|| "no usage windows".into())
}
