//! Agent usage quota HTTP handler.
//!
//! GET /api/v1/agent-usage/{agent}?force=<bool>
//!
//! Returns the current Claude / Codex / Gemini quota, or 404 when the agent
//! isn't one of the three supported IDs or when no usage data is available
//! (missing credentials, expired token, upstream error). The frontend treats
//! 404 as "feature not available for this agent" and hides the badge.

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

use crate::agent_usage::{self, AgentUsage};

#[derive(Debug, Deserialize)]
pub struct UsageQuery {
    /// Bypass the 60s in-memory cache and fetch fresh data.
    #[serde(default)]
    pub force: bool,
}

/// GET /api/v1/agent-usage/{agent}
pub async fn get_agent_usage(
    Path(agent): Path<String>,
    Query(query): Query<UsageQuery>,
) -> Result<Json<AgentUsage>, StatusCode> {
    match agent.as_str() {
        "claude" | "codex" | "gemini" => {}
        _ => return Err(StatusCode::NOT_FOUND),
    }
    agent_usage::fetch_usage(&agent, query.force)
        .await
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}
