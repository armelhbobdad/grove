//! AI settings persistence (providers + audio)
//!
//! - Providers: global, stored in `~/.grove/ai/providers.json`
//! - Audio: global in `~/.grove/ai/audio.json`, project-level in
//!   `~/.grove/projects/{hash}/ai/audio.json`

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

use super::grove_dir;
use crate::error::Result;

// ─── Provider Profile ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderProfile {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub status: String, // "verified" | "draft" | "failed"
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProvidersData {
    #[serde(default)]
    pub providers: Vec<ProviderProfile>,
}

fn providers_path() -> PathBuf {
    grove_dir().join("ai").join("providers.json")
}

pub fn load_providers() -> ProvidersData {
    let path = providers_path();
    if !path.exists() {
        return ProvidersData::default();
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_providers(data: &ProvidersData) -> Result<()> {
    let path = providers_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn generate_provider_id() -> String {
    Uuid::new_v4().to_string()
}

// ─── Audio Settings ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplacementRule {
    pub from: String,
    pub to: String,
}

/// Global audio settings (stored in `~/.grove/ai/audio.json`)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSettingsGlobal {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub transcribe_provider: String,
    #[serde(default)]
    pub preferred_languages: Vec<String>,
    /// Combo key shortcut for toggle mode (e.g. "Cmd+Shift+.")
    #[serde(default)]
    pub toggle_shortcut: String,
    /// Single key for push-to-talk mode (e.g. "F5")
    #[serde(default)]
    pub push_to_talk_key: String,
    /// Max recording duration in seconds
    #[serde(default = "default_max_duration")]
    pub max_duration: u32,
    /// Min recording duration in seconds (below = discard)
    #[serde(default = "default_min_duration")]
    pub min_duration: u32,
    #[serde(default)]
    pub revise_enabled: bool,
    #[serde(default)]
    pub revise_provider: String,
    #[serde(default)]
    pub revise_prompt: String,
    #[serde(default)]
    pub preferred_terms: Vec<String>,
    #[serde(default)]
    pub forbidden_terms: Vec<String>,
    #[serde(default)]
    pub replacements: Vec<ReplacementRule>,
}

fn default_max_duration() -> u32 {
    60
}

fn default_min_duration() -> u32 {
    2
}

impl Default for AudioSettingsGlobal {
    fn default() -> Self {
        Self {
            enabled: false,
            transcribe_provider: String::new(),
            preferred_languages: Vec::new(),
            toggle_shortcut: String::new(),
            push_to_talk_key: String::new(),
            max_duration: default_max_duration(),
            min_duration: default_min_duration(),
            revise_enabled: false,
            revise_provider: String::new(),
            revise_prompt: String::new(),
            preferred_terms: Vec::new(),
            forbidden_terms: Vec::new(),
            replacements: Vec::new(),
        }
    }
}

/// Project-level audio settings (stored in `~/.grove/projects/{hash}/ai/audio.json`)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AudioSettingsProject {
    #[serde(default)]
    pub revise_prompt: String,
    #[serde(default)]
    pub preferred_terms: Vec<String>,
    #[serde(default)]
    pub forbidden_terms: Vec<String>,
    #[serde(default)]
    pub replacements: Vec<ReplacementRule>,
}

fn audio_global_path() -> PathBuf {
    grove_dir().join("ai").join("audio.json")
}

fn audio_project_path(project_hash: &str) -> PathBuf {
    grove_dir()
        .join("projects")
        .join(project_hash)
        .join("ai")
        .join("audio.json")
}

pub fn load_audio_global() -> AudioSettingsGlobal {
    let path = audio_global_path();
    if !path.exists() {
        return AudioSettingsGlobal::default();
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_audio_global(data: &AudioSettingsGlobal) -> Result<()> {
    let path = audio_global_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn load_audio_project(project_hash: &str) -> AudioSettingsProject {
    let path = audio_project_path(project_hash);
    if !path.exists() {
        return AudioSettingsProject::default();
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_audio_project(project_hash: &str, data: &AudioSettingsProject) -> Result<()> {
    let path = audio_project_path(project_hash);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content)?;
    Ok(())
}
