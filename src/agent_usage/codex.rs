//! Codex (ChatGPT) usage quota fetcher.
//!
//! Reads `~/.codex/auth.json` for `tokens.access_token` and calls
//! `https://chatgpt.com/backend-api/wham/usage`. The endpoint requires a
//! browser-like User-Agent header — plain ureq UA gets rejected.
//!
//! Matches the reference Raycast extension's parsing:
//!   - Both `primary_window` and `secondary_window` are required
//!   - `code_review_rate_limit.primary_window` is optional
//!   - `credits` (has_credits / unlimited / balance) is surfaced as extras

use super::{
    clamp_percent, AcpQuotaProvider, AgentUsage, ExtraInfo, UsageWindow, HTTP_TIMEOUT_CODEX,
};
use serde::Deserialize;
use std::fs;

const AUTH_PATH: &str = ".codex/auth.json";
const USAGE_URL: &str = "https://chatgpt.com/backend-api/wham/usage";
const BROWSER_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
                          (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[derive(Debug, Deserialize)]
struct AuthFile {
    tokens: Option<TokensBlock>,
}

#[derive(Debug, Deserialize)]
struct TokensBlock {
    access_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageResponse {
    plan_type: Option<String>,
    rate_limit: Option<RateLimitBlock>,
    code_review_rate_limit: Option<CodeReviewRateLimitBlock>,
    credits: Option<CreditsBlock>,
}

#[derive(Debug, Deserialize)]
struct RateLimitBlock {
    primary_window: Option<Window>,
    secondary_window: Option<Window>,
}

#[derive(Debug, Deserialize)]
struct CodeReviewRateLimitBlock {
    primary_window: Option<Window>,
}

#[derive(Debug, Deserialize)]
struct Window {
    used_percent: Option<f32>,
    reset_after_seconds: Option<i64>,
    limit_window_seconds: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CreditsBlock {
    has_credits: Option<bool>,
    unlimited: Option<bool>,
    balance: Option<String>,
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/// Codex ACP quota provider. Resolves tokens from `~/.codex/auth.json` and
/// calls the ChatGPT wham/usage API.
pub struct CodexProvider;

impl AcpQuotaProvider for CodexProvider {
    fn provider_id(&self) -> &str {
        "codex"
    }

    fn quota_id(&self, _model: Option<&str>) -> String {
        "codex".to_string()
    }

    fn fetch_usage(&self, _model: Option<&str>) -> Result<AgentUsage, String> {
        let token = read_access_token()?;
        fetch_with_token(&token)
    }
}

fn read_access_token() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("no home directory")?;
    let path = home.join(AUTH_PATH);
    let raw = fs::read_to_string(&path).map_err(|e| format!("read {:?}: {}", path, e))?;
    let auth: AuthFile =
        serde_json::from_str(&raw).map_err(|e| format!("parse auth.json: {}", e))?;
    let token = auth
        .tokens
        .and_then(|t| t.access_token)
        .ok_or("missing tokens.access_token")?
        .trim()
        .to_string();
    if token.is_empty() {
        return Err("empty access_token".into());
    }
    Ok(token)
}

/// Lower-level fetcher that takes an already-resolved token. Exposed for reuse
/// by multi-provider agents.
pub(super) fn fetch_with_token(token: &str) -> Result<AgentUsage, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(HTTP_TIMEOUT_CODEX)
        .build();
    let resp = agent
        .get(USAGE_URL)
        .set("Authorization", &format!("Bearer {}", token))
        .set("User-Agent", BROWSER_UA)
        .set("Accept", "application/json")
        .call()
        .map_err(|e| format!("usage api call failed: {}", e))?;
    let body: UsageResponse = resp
        .into_json()
        .map_err(|e| format!("parse usage response: {}", e))?;

    let rate = body.rate_limit.ok_or("missing rate_limit")?;
    let primary = rate.primary_window.ok_or("missing primary_window")?;
    let secondary = rate.secondary_window.ok_or("missing secondary_window")?;
    // Both windows must carry used_percent, matching the reference.
    let primary_used = primary.used_percent.ok_or("primary used_percent missing")?;
    let secondary_used = secondary
        .used_percent
        .ok_or("secondary used_percent missing")?;

    let mut usage = AgentUsage::new("codex");
    usage.plan = match body.plan_type.as_deref() {
        Some(p) if !p.trim().is_empty() => Some(format!("ChatGPT {}", p.trim())),
        _ => Some("ChatGPT".to_string()),
    };

    usage.windows.push(UsageWindow {
        label: "5h limit".to_string(),
        percentage_remaining: clamp_percent(100.0 - primary_used),
        resets_at: absolute_reset(primary.reset_after_seconds),
        resets_in_seconds: primary.reset_after_seconds,
        total_window_seconds: primary.limit_window_seconds.or(Some(5 * 3600)),
    });
    usage.windows.push(UsageWindow {
        label: "Weekly limit".to_string(),
        percentage_remaining: clamp_percent(100.0 - secondary_used),
        resets_at: absolute_reset(secondary.reset_after_seconds),
        resets_in_seconds: secondary.reset_after_seconds,
        total_window_seconds: secondary.limit_window_seconds.or(Some(7 * 86400)),
    });

    if let Some(cr) = body.code_review_rate_limit.and_then(|b| b.primary_window) {
        if let Some(used) = cr.used_percent {
            usage.windows.push(UsageWindow {
                label: "Code review".to_string(),
                percentage_remaining: clamp_percent(100.0 - used),
                resets_at: absolute_reset(cr.reset_after_seconds),
                resets_in_seconds: cr.reset_after_seconds,
                total_window_seconds: cr.limit_window_seconds,
            });
        }
    }

    if let Some(credits) = body.credits {
        if credits.unlimited.unwrap_or(false) {
            usage.extras.push(ExtraInfo {
                label: "Credits".to_string(),
                value: "Unlimited".to_string(),
            });
        } else if credits.has_credits.unwrap_or(false) {
            if let Some(balance) = credits.balance {
                usage.extras.push(ExtraInfo {
                    label: "Credits".to_string(),
                    value: balance,
                });
            }
        }
    }

    usage.finalize().ok_or_else(|| "no usage windows".into())
}

fn absolute_reset(reset_after_seconds: Option<i64>) -> Option<String> {
    let secs = reset_after_seconds?;
    let target = chrono::Utc::now() + chrono::Duration::seconds(secs);
    Some(target.to_rfc3339())
}
