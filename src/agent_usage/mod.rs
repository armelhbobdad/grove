//! Agent usage quota fetching for Claude Code / Codex / Gemini.
//!
//! Reads local credential files (OAuth tokens) and, for Claude Code on macOS,
//! also falls back to the login keychain. We never refresh tokens and never
//! write credentials back. If a token is expired or any upstream call fails,
//! the function returns `None` and the frontend hides the quota badge.
//!
//! Results are cached in memory per-agent with a 60s fresh TTL plus an
//! indefinite "last successful value" fallback. Callers can pass
//! `force = true` to bypass the fresh cache and fetch live.

pub mod claude;
pub mod codex;
pub mod gemini;

use once_cell::sync::Lazy;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Cache TTL for agent usage data.
const CACHE_TTL: Duration = Duration::from_secs(60);

/// Per-agent HTTP timeouts for outbound upstream calls. Matches the reference
/// Raycast extension's values (Gemini's two-step flow is slightly slower).
pub(crate) const HTTP_TIMEOUT_CLAUDE: Duration = Duration::from_secs(10);
pub(crate) const HTTP_TIMEOUT_CODEX: Duration = Duration::from_secs(10);
pub(crate) const HTTP_TIMEOUT_GEMINI: Duration = Duration::from_secs(15);

/// A single rate-limit window reported to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct UsageWindow {
    /// Human-readable label, e.g. "5h limit", "7d limit", "Gemini 2.5 Pro".
    pub label: String,
    /// Remaining percentage (0.0 - 100.0).
    pub percentage_remaining: f32,
    /// ISO 8601 timestamp at which the window resets, if known.
    pub resets_at: Option<String>,
    /// Seconds until reset, if known (fallback when `resets_at` is unavailable).
    pub resets_in_seconds: Option<i64>,
}

/// An extra info row for the tooltip (credits balance, account email, tier, …).
#[derive(Debug, Clone, Serialize)]
pub struct ExtraInfo {
    pub label: String,
    pub value: String,
}

/// Unified agent usage payload returned to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct AgentUsage {
    /// "claude" | "codex" | "gemini"
    pub agent: String,
    /// Plan or tier name, e.g. "Claude Max", "ChatGPT Pro", "Gemini Paid".
    pub plan: Option<String>,
    /// The smallest `percentage_remaining` across all windows (the most
    /// constrained quota). Frontend display policy can choose a different
    /// window, but the backend keeps this field as a pure aggregate.
    pub percentage_remaining: f32,
    /// All windows — shown as rows in the badge's hover tooltip.
    pub windows: Vec<UsageWindow>,
    /// Additional informational rows for the tooltip (credits, email, etc.).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub extras: Vec<ExtraInfo>,
    /// True when the response is serving the last successful value because a
    /// fresh upstream fetch failed.
    pub outdated: bool,
    /// ISO 8601 timestamp when this value was last fetched successfully.
    pub fetched_at: Option<String>,
    /// "fresh_cache" | "live" | "last_success_fallback"
    pub source: String,
}

#[derive(Debug, Clone)]
pub enum UsageError {
    UnsupportedAgent,
    Unauthorized(String),
    Forbidden(String),
    RateLimited(String),
    Upstream(String),
    Internal(String),
}

impl UsageError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::UnsupportedAgent => "unsupported_agent",
            Self::Unauthorized(_) => "unauthorized",
            Self::Forbidden(_) => "forbidden",
            Self::RateLimited(_) => "rate_limited",
            Self::Upstream(_) => "upstream_error",
            Self::Internal(_) => "internal_error",
        }
    }

    pub fn message(&self) -> &str {
        match self {
            Self::UnsupportedAgent => "Unsupported agent",
            Self::Unauthorized(msg)
            | Self::Forbidden(msg)
            | Self::RateLimited(msg)
            | Self::Upstream(msg)
            | Self::Internal(msg) => msg,
        }
    }
}

impl AgentUsage {
    pub fn new(agent: impl Into<String>) -> Self {
        Self {
            agent: agent.into(),
            plan: None,
            percentage_remaining: 100.0,
            windows: Vec::new(),
            extras: Vec::new(),
            outdated: false,
            fetched_at: None,
            source: "live".to_string(),
        }
    }

    /// Finalize: round each window's percentage, then compute the minimum.
    /// Rounding happens on the backend so the frontend's displayed number
    /// and its color-threshold check stay in sync — e.g. 49.6 becomes 50
    /// (green), not "50% in amber". Returns `None` if there are zero windows.
    pub fn finalize(mut self) -> Option<Self> {
        if self.windows.is_empty() {
            return None;
        }
        for w in &mut self.windows {
            w.percentage_remaining = w.percentage_remaining.clamp(0.0, 100.0).round();
        }
        let min = self
            .windows
            .iter()
            .map(|w| w.percentage_remaining)
            .fold(f32::INFINITY, f32::min);
        self.percentage_remaining = min.clamp(0.0, 100.0);
        Some(self)
    }
}

#[derive(Clone)]
struct CacheEntry {
    usage: AgentUsage,
    fetched_at: Instant,
    fetched_at_iso: String,
}

static CACHE: Lazy<Mutex<HashMap<String, CacheEntry>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Fetch usage for the given agent ("claude" / "codex" / "gemini").
///
/// When `force` is false, a cached entry newer than `CACHE_TTL` is returned
/// without hitting the upstream API. When `force` is true, the fresh cache is
/// bypassed and a live fetch is attempted.
///
/// On fetch failure, the last successful value (if any) is returned with
/// `outdated = true`. If no successful value has ever been cached, `None`
/// is returned and the frontend hides the badge.
pub async fn fetch_usage(agent: &str, force: bool) -> Result<AgentUsage, UsageError> {
    if !force {
        if let Some(cached) = get_fresh_cached(agent) {
            return Ok(cached);
        }
    }

    let agent_owned = agent.to_string();
    let fetched = tokio::task::spawn_blocking(move || fetch_blocking(&agent_owned))
        .await
        .ok()
        .unwrap_or_else(|| Err(UsageError::Internal("quota fetch task failed".into())));

    match fetched {
        Ok(usage) => Ok(put_cached(agent, usage)),
        Err(err) => get_last_success(agent).ok_or(err),
    }
}

/// Return cached entry only if it's within the normal TTL (fresh).
fn get_fresh_cached(agent: &str) -> Option<AgentUsage> {
    let guard = CACHE.lock().ok()?;
    let entry = guard.get(agent)?;
    if entry.fetched_at.elapsed() < CACHE_TTL {
        Some(with_metadata(
            &entry.usage,
            false,
            Some(entry.fetched_at_iso.clone()),
            "fresh_cache",
        ))
    } else {
        None
    }
}

/// Return the last successful value, regardless of age.
fn get_last_success(agent: &str) -> Option<AgentUsage> {
    let guard = CACHE.lock().ok()?;
    let entry = guard.get(agent)?;
    Some(with_metadata(
        &entry.usage,
        true,
        Some(entry.fetched_at_iso.clone()),
        "last_success_fallback",
    ))
}

fn put_cached(agent: &str, usage: AgentUsage) -> AgentUsage {
    let fetched_at_iso = chrono::Utc::now().to_rfc3339();
    let response = with_metadata(&usage, false, Some(fetched_at_iso.clone()), "live");
    if let Ok(mut guard) = CACHE.lock() {
        guard.insert(
            agent.to_string(),
            CacheEntry {
                usage,
                fetched_at: Instant::now(),
                fetched_at_iso: fetched_at_iso.clone(),
            },
        );
    }
    response
}

fn with_metadata(
    usage: &AgentUsage,
    outdated: bool,
    fetched_at: Option<String>,
    source: &str,
) -> AgentUsage {
    let mut usage = usage.clone();
    usage.outdated = outdated;
    usage.fetched_at = fetched_at;
    usage.source = source.to_string();
    usage
}

/// Dispatch to the agent-specific blocking fetcher.
///
/// Errors are intentionally swallowed without logging: this feature is
/// designed to be "invisible on failure" (the frontend hides the badge on
/// 404), and a failed fetch happens every minute while credentials are
/// missing — logging would spam stderr.
fn fetch_blocking(agent: &str) -> Result<AgentUsage, UsageError> {
    match agent {
        "claude" => claude::fetch().map_err(|e| classify_error("claude", &e)),
        "codex" => codex::fetch().map_err(|e| classify_error("codex", &e)),
        "gemini" => gemini::fetch().map_err(|e| classify_error("gemini", &e)),
        _ => Err(UsageError::UnsupportedAgent),
    }
}

fn classify_error(agent: &str, message: &str) -> UsageError {
    let msg = message.to_ascii_lowercase();

    if msg.contains("status code 429") || msg.contains("rate limited") || msg.contains("rate_limit")
    {
        return UsageError::RateLimited(format!("{} quota upstream rate limited", agent));
    }
    if msg.contains("status code 401")
        || msg.contains("credentials not found")
        || msg.contains("missing access_token")
        || msg.contains("missing tokens.access_token")
        || msg.contains("empty access_token")
        || msg.contains("access_token expired")
    {
        return UsageError::Unauthorized(format!("{} credentials unavailable or expired", agent));
    }
    if msg.contains("status code 403")
        || msg.contains("unsupported auth type")
        || msg.contains("missing required scopes")
    {
        return UsageError::Forbidden(format!("{} credentials do not have required access", agent));
    }
    if msg.contains("parse usage response")
        || msg.contains("parse quota response")
        || msg.contains("missing five_hour")
        || msg.contains("used_percent missing")
        || msg.contains("no usage windows")
        || msg.contains("no quota buckets")
    {
        return UsageError::Upstream(format!(
            "{} quota upstream returned an unexpected response",
            agent
        ));
    }
    if msg.contains("usage api call failed")
        || msg.contains("retrieveuserquota failed")
        || msg.contains("read ")
    {
        return UsageError::Upstream(format!("{} quota upstream request failed", agent));
    }

    UsageError::Internal(format!("{} quota fetch failed", agent))
}

/// Convert an ISO 8601 timestamp into seconds remaining from "now". Returns
/// `None` if the string cannot be parsed.
pub(crate) fn iso_to_seconds_remaining(iso: &str) -> Option<i64> {
    let target = chrono::DateTime::parse_from_rfc3339(iso).ok()?;
    let now = chrono::Utc::now();
    Some((target.with_timezone(&chrono::Utc) - now).num_seconds())
}

/// Clamp a percentage to `[0, 100]` and round to a whole number.
pub(crate) fn clamp_percent(v: f32) -> f32 {
    if !v.is_finite() {
        return 0.0;
    }
    v.clamp(0.0, 100.0).round()
}
