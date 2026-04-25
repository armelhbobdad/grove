//! Gemini usage quota fetcher.
//!
//! Mirrors the reference Raycast extension's flow:
//!   1. Parse `~/.gemini/settings.json` to verify `authType` is OAuth
//!      (api-key / vertex-ai are rejected)
//!   2. Read `~/.gemini/oauth_creds.json` for `access_token` + `id_token`
//!   3. If `expiry_date` is in the past → unavailable (we do not refresh)
//!   4. Decode `id_token` JWT to surface the user email in the tooltip
//!   5. POST `cloudcode-pa.googleapis.com/v1internal:loadCodeAssist` to get
//!      `currentTier.id` and `cloudaicompanionProject`
//!   6. If no project id returned, GET `cloudresourcemanager.googleapis.com/v1/projects`
//!      and look for a `gen-lang-client*` project or one labelled `generative-language`
//!   7. POST `v1internal:retrieveUserQuota` with `{ project }` (if known)
//!   8. Pick highest-version "pro" and "flash" models from the returned buckets

use super::{
    clamp_percent, iso_to_seconds_remaining, AcpQuotaProvider, AgentUsage, ExtraInfo, UsageWindow,
    HTTP_TIMEOUT_GEMINI,
};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

const SETTINGS_PATH: &str = ".gemini/settings.json";
const CREDS_PATH: &str = ".gemini/oauth_creds.json";

const LOAD_CODE_ASSIST_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const QUOTA_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const PROJECTS_URL: &str = "https://cloudresourcemanager.googleapis.com/v1/projects";

#[derive(Debug, Deserialize)]
struct SettingsFile {
    #[serde(rename = "authType")]
    auth_type: Option<String>,
    security: Option<SecurityBlock>,
}

#[derive(Debug, Deserialize)]
struct SecurityBlock {
    auth: Option<SecurityAuthBlock>,
}

#[derive(Debug, Deserialize)]
struct SecurityAuthBlock {
    #[serde(rename = "selectedType")]
    selected_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAuthCreds {
    access_token: Option<String>,
    id_token: Option<String>,
    expiry_date: Option<i64>,
}

#[derive(Debug, Serialize)]
struct LoadAssistRequest {
    metadata: LoadAssistMetadata,
}

#[derive(Debug, Serialize)]
struct LoadAssistMetadata {
    #[serde(rename = "ideType")]
    ide_type: &'static str,
    #[serde(rename = "pluginType")]
    plugin_type: &'static str,
}

#[derive(Debug, Serialize)]
struct QuotaRequest<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    project: Option<&'a str>,
}

#[derive(Debug, Clone, Deserialize)]
struct Bucket {
    #[serde(rename = "remainingFraction")]
    remaining_fraction: Option<f32>,
    #[serde(rename = "resetTime")]
    reset_time: Option<String>,
    #[serde(rename = "modelId")]
    model_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QuotaResponse {
    buckets: Option<Vec<Bucket>>,
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/// Gemini ACP quota provider. Reads creds from `~/.gemini/oauth_creds.json`
/// once, then drives the code-assist API flow.
pub struct GeminiProvider;

impl AcpQuotaProvider for GeminiProvider {
    fn provider_id(&self) -> &str {
        "gemini"
    }

    fn quota_id(&self, _model: Option<&str>) -> String {
        "gemini".to_string()
    }

    fn fetch_usage(&self, _model: Option<&str>) -> Result<AgentUsage, String> {
        let home = dirs::home_dir().ok_or("no home directory")?;

        // 1. settings.json auth-type guard (best-effort; missing file → accept)
        let settings_path = home.join(SETTINGS_PATH);
        if settings_path.exists() {
            let raw = fs::read_to_string(&settings_path)
                .map_err(|e| format!("read settings.json: {}", e))?;
            let settings: SettingsFile =
                serde_json::from_str(&raw).map_err(|e| format!("parse settings.json: {}", e))?;
            let effective_auth = settings
                .security
                .as_ref()
                .and_then(|s| s.auth.as_ref())
                .and_then(|a| a.selected_type.as_deref())
                .or(settings.auth_type.as_deref())
                .unwrap_or("");
            if effective_auth == "api-key" || effective_auth == "vertex-ai" {
                return Err(format!("unsupported auth type: {}", effective_auth));
            }
        }

        // 2. oauth_creds.json (read once — keeps access_token AND id_token)
        let creds_path = home.join(CREDS_PATH);
        let raw =
            fs::read_to_string(&creds_path).map_err(|e| format!("read {:?}: {}", creds_path, e))?;
        let creds: OAuthCreds =
            serde_json::from_str(&raw).map_err(|e| format!("parse oauth_creds.json: {}", e))?;
        let access_token = creds
            .access_token
            .as_deref()
            .ok_or("missing access_token")?
            .trim()
            .to_string();
        if access_token.is_empty() {
            return Err("empty access_token".into());
        }

        // 3. expiry guard (we do not refresh)
        if let Some(expiry_ms) = creds.expiry_date {
            if expiry_ms > 0 && expiry_ms < chrono::Utc::now().timestamp_millis() {
                return Err("access_token expired".into());
            }
        }

        let agent = ureq::AgentBuilder::new()
            .timeout(HTTP_TIMEOUT_GEMINI)
            .build();

        // 4. email from id_token JWT (from the same creds we already loaded)
        let email = creds
            .id_token
            .as_deref()
            .and_then(decode_jwt_email)
            .unwrap_or_else(|| "Unknown".to_string());

        // 5. loadCodeAssist → tier + project
        let (tier, project_from_tier) = fetch_tier(&agent, &access_token);

        // 6. fallback project lookup
        let project_id = match project_from_tier {
            Some(p) => Some(p),
            None => fetch_project_id(&agent, &access_token),
        };

        // 7. retrieveUserQuota
        let buckets = fetch_quota(&agent, &access_token, project_id.as_deref())?;

        // 8. assemble windows: highest-version pro and flash
        let mut pro_model: Option<(f32, Bucket)> = None;
        let mut flash_model: Option<(f32, Bucket)> = None;
        for bucket in buckets {
            if bucket.remaining_fraction.is_none() {
                continue;
            }
            let model_lower = bucket
                .model_id
                .as_deref()
                .unwrap_or("")
                .to_ascii_lowercase();
            let version = extract_model_version(&model_lower);
            if model_lower.contains("pro")
                && !model_lower.contains("flash")
                && pro_model.as_ref().is_none_or(|(v, _)| version > *v)
            {
                pro_model = Some((version, bucket));
            } else if model_lower.contains("flash")
                && flash_model.as_ref().is_none_or(|(v, _)| version > *v)
            {
                flash_model = Some((version, bucket));
            }
        }

        let mut usage = AgentUsage::new("gemini");
        usage.plan = Some(format!("Gemini {}", tier));
        usage.extras.push(ExtraInfo {
            label: "Account".to_string(),
            value: email,
        });

        if let Some((_, b)) = pro_model {
            push_bucket(&mut usage.windows, b);
        }
        if let Some((_, b)) = flash_model {
            push_bucket(&mut usage.windows, b);
        }

        usage
            .finalize()
            .ok_or_else(|| "no quota buckets returned".into())
    }
}

// ---------- tier + project ----------

fn fetch_tier(agent: &ureq::Agent, access_token: &str) -> (String, Option<String>) {
    let body = LoadAssistRequest {
        metadata: LoadAssistMetadata {
            ide_type: "GEMINI_CLI",
            plugin_type: "GEMINI",
        },
    };
    let Ok(value) = serde_json::to_value(&body) else {
        return ("Unknown".into(), None);
    };
    let Ok(resp) = agent
        .post(LOAD_CODE_ASSIST_URL)
        .set("Authorization", &format!("Bearer {}", access_token))
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send_json(value)
    else {
        return ("Unknown".into(), None);
    };
    let Ok(data): Result<Value, _> = resp.into_json() else {
        return ("Unknown".into(), None);
    };

    let tier_str = data
        .get("currentTier")
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let tier = match tier_str {
        "standard-tier" | "g1-pro-tier" => "Paid",
        "free-tier" => "Free",
        "legacy-tier" => "Legacy",
        _ => "Unknown",
    }
    .to_string();

    let project_id = data
        .get("cloudaicompanionProject")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    (tier, project_id)
}

fn fetch_project_id(agent: &ureq::Agent, access_token: &str) -> Option<String> {
    let resp = agent
        .get(PROJECTS_URL)
        .set("Authorization", &format!("Bearer {}", access_token))
        .set("Accept", "application/json")
        .call()
        .ok()?;
    let data: Value = resp.into_json().ok()?;
    let projects = data.get("projects")?.as_array()?;
    for p in projects {
        let project_id = p.get("projectId").and_then(|v| v.as_str()).unwrap_or("");
        if project_id.starts_with("gen-lang-client") {
            return Some(project_id.to_string());
        }
        if p.get("labels")
            .and_then(|l| l.get("generative-language"))
            .is_some()
        {
            return Some(project_id.to_string());
        }
    }
    None
}

// ---------- quota ----------

fn fetch_quota(
    agent: &ureq::Agent,
    access_token: &str,
    project_id: Option<&str>,
) -> Result<Vec<Bucket>, String> {
    let body = QuotaRequest {
        project: project_id,
    };
    let value = serde_json::to_value(&body).map_err(|e| e.to_string())?;
    let resp = agent
        .post(QUOTA_URL)
        .set("Authorization", &format!("Bearer {}", access_token))
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send_json(value)
        .map_err(|e| format!("retrieveUserQuota failed: {}", e))?;
    let parsed: QuotaResponse = resp
        .into_json()
        .map_err(|e| format!("parse quota response: {}", e))?;
    Ok(parsed.buckets.unwrap_or_default())
}

fn push_bucket(out: &mut Vec<UsageWindow>, bucket: Bucket) {
    let Some(frac) = bucket.remaining_fraction else {
        return;
    };
    let label = bucket
        .model_id
        .as_deref()
        .map(pretty_model)
        .unwrap_or_else(|| "Gemini".to_string());
    let resets_in_seconds = bucket
        .reset_time
        .as_deref()
        .and_then(iso_to_seconds_remaining);
    out.push(UsageWindow {
        label,
        percentage_remaining: clamp_percent(frac * 100.0),
        resets_at: bucket.reset_time,
        resets_in_seconds,
        // Gemini per-model buckets reset daily at 00:00 PT; the API doesn't
        // declare the window length explicitly, so we hard-code 24h.
        total_window_seconds: Some(86400),
    });
}

// ---------- helpers ----------

fn decode_jwt_email(id_token: &str) -> Option<String> {
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let payload_b64 = parts[1];
    // base64url → base64 with padding
    let mut padded = payload_b64.replace('-', "+").replace('_', "/");
    let pad_len = (4 - padded.len() % 4) % 4;
    padded.push_str(&"=".repeat(pad_len));
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(padded.as_bytes())
        .ok()?;
    let json: Value = serde_json::from_slice(&bytes).ok()?;
    json.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// "gemini-2.5-pro" → 2.5, "gemini-3-flash-preview" → 3.0
///
/// Matches the reference regex `gemini-(\d+(?:\.\d+)?)`: at most one decimal
/// point is consumed. Dotted-triple IDs like "gemini-2.5.1-pro" yield 2.5
/// (not 0.0), so newer minor revisions don't lose the highest-version race
/// to an older 2.5.
fn extract_model_version(model_lower: &str) -> f32 {
    let Some(rest) = model_lower.strip_prefix("gemini-") else {
        return 0.0;
    };
    let mut seen_dot = false;
    let num_part: String = rest
        .chars()
        .take_while(|c| {
            if c.is_ascii_digit() {
                true
            } else if *c == '.' && !seen_dot {
                seen_dot = true;
                true
            } else {
                false
            }
        })
        .collect();
    // Strip a trailing dot ("gemini-2." is not a valid version prefix).
    let trimmed = num_part.trim_end_matches('.');
    trimmed.parse::<f32>().unwrap_or(0.0)
}

/// "gemini-2.5-pro" → "Gemini 2.5 Pro"
fn pretty_model(raw: &str) -> String {
    raw.split('-')
        .filter(|s| !s.is_empty())
        .map(|s| {
            let mut chars = s.chars();
            match chars.next() {
                Some(c) if c.is_ascii_alphabetic() => {
                    c.to_uppercase().collect::<String>() + chars.as_str()
                }
                _ => s.to_string(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
