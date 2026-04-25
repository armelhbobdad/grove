//! Shared reader for OpenCode's `~/.local/share/opencode/auth.json`.
//!
//! Many agents (Kimi, Synthetic, Zai, …) reuse OpenCode's login flow to store
//! provider credentials. The file is a flat map of `{provider_key: entry}`
//! where most entries expose the token in `key`, while `github-copilot` uses
//! `access` (OAuth). Mirrors the reference Raycast extension.
//!
//! `TEST_OPENCODE_AUTH_PATH` env var overrides the file path for tests.

use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

const AUTH_SUBPATH: &str = ".local/share/opencode/auth.json";
const TEST_OVERRIDE_ENV: &str = "TEST_OPENCODE_AUTH_PATH";

#[derive(Debug, Deserialize)]
struct Entry {
    key: Option<String>,
    access: Option<String>,
}

fn auth_path() -> Option<PathBuf> {
    if let Ok(override_path) = std::env::var(TEST_OVERRIDE_ENV) {
        if !override_path.is_empty() {
            return Some(PathBuf::from(override_path));
        }
    }
    Some(dirs::home_dir()?.join(AUTH_SUBPATH))
}

/// Read the token for `provider_key` from OpenCode's auth.json.
///
/// Returns the trimmed token (prefers `key`, falls back to `access` for
/// `github-copilot`-style entries). Returns `None` if the file is missing,
/// unreadable, malformed, or the key isn't present.
pub fn read_opencode_token(provider_key: &str) -> Option<String> {
    let path = auth_path()?;
    if !path.exists() {
        return None;
    }
    let raw = fs::read_to_string(&path).ok()?;
    let parsed: HashMap<String, Entry> = serde_json::from_str(&raw).ok()?;
    let entry = parsed.get(provider_key)?;
    let token = entry
        .key
        .as_deref()
        .or(entry.access.as_deref())
        .map(str::trim)
        .unwrap_or("");
    if token.is_empty() {
        None
    } else {
        Some(token.to_string())
    }
}
