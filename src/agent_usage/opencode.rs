//! OpenCode multi-provider quota dispatcher.
//!
//! OpenCode itself has no single quota API — it proxies to whichever upstream
//! the user's selected model belongs to. This provider classifies the model
//! string, resolves the matching credential from OpenCode's `auth.json`
//! (plus env fallbacks for z.ai), and delegates to the corresponding
//! lower-level fetcher.
//!
//! Model classification is prefix-based: `synthetic/...`, `moonshotai/...`,
//! `zai/...` etc. Unknown providers return an error and the frontend hides
//! the quota badge for that model.

use super::opencode_auth::read_opencode_token;
use super::{copilot, kimi, minimax, synthetic, zai, AcpQuotaProvider, AgentUsage};

pub struct OpencodeProvider;

/// Which upstream a given model routes to. Kept in its own type so
/// `quota_id` and `fetch_usage` agree on the classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Upstream {
    Kimi,
    Synthetic,
    Zai,
    Copilot,
    MiniMax,
    Unknown,
}

impl Upstream {
    fn as_str(self) -> &'static str {
        match self {
            Upstream::Kimi => "kimi",
            Upstream::Synthetic => "synthetic",
            Upstream::Zai => "zai",
            Upstream::Copilot => "copilot",
            Upstream::MiniMax => "minimax",
            Upstream::Unknown => "unknown",
        }
    }
}

fn classify(model: Option<&str>) -> Upstream {
    let Some(m) = model else {
        return Upstream::Unknown;
    };
    let lower = m.to_ascii_lowercase();
    // Provider segment is whatever comes before the first '/'.
    let provider = lower.split('/').next().unwrap_or("");

    match provider {
        "synthetic" => Upstream::Synthetic,
        "moonshotai" | "moonshot" | "kimi" => Upstream::Kimi,
        "zai" | "zhipuai" | "glm" | "z-ai" | "bigmodel" => Upstream::Zai,
        "github-copilot" | "copilot" => Upstream::Copilot,
        "minimax" | "minimaxi" => Upstream::MiniMax,
        _ => {
            // Loose keyword match when no `/` prefix is present.
            if lower.contains("kimi") || lower.contains("moonshot") {
                Upstream::Kimi
            } else if lower.contains("glm")
                || lower.contains("zhipu")
                || lower.contains("zai")
                || lower.contains("z-ai")
            {
                Upstream::Zai
            } else if lower.contains("minimax") {
                Upstream::MiniMax
            } else {
                Upstream::Unknown
            }
        }
    }
}

impl AcpQuotaProvider for OpencodeProvider {
    fn provider_id(&self) -> &str {
        "opencode"
    }

    fn quota_id(&self, model: Option<&str>) -> String {
        format!("opencode:{}", classify(model).as_str())
    }

    fn fetch_usage(&self, model: Option<&str>) -> Result<AgentUsage, String> {
        match classify(model) {
            Upstream::Kimi => {
                let token = read_opencode_token(kimi::OPENCODE_KEY)
                    .ok_or("opencode kimi-for-coding token not found")?;
                let mut usage = kimi::fetch_with_token(&token)?;
                // Rebrand so the frontend's `cached.agent === agentId` check
                // matches the active ACP agent ("opencode"), not "kimi".
                usage.agent = "opencode".to_string();
                Ok(usage)
            }
            Upstream::Synthetic => {
                let token = read_opencode_token(synthetic::OPENCODE_KEY)
                    .ok_or("opencode synthetic token not found")?;
                let mut usage = synthetic::fetch_with_token(&token)?;
                usage.agent = "opencode".to_string();
                Ok(usage)
            }
            Upstream::Zai => {
                let token = zai::resolve_token().ok_or("zai token not found")?;
                let mut usage = zai::fetch_with_token(&token)?;
                usage.agent = "opencode".to_string();
                Ok(usage)
            }
            Upstream::Copilot => {
                let token = read_opencode_token("github-copilot")
                    .ok_or("opencode github-copilot token not found")?;
                let mut usage = copilot::fetch_with_token(&token)?;
                usage.agent = "opencode".to_string();
                Ok(usage)
            }
            Upstream::MiniMax => {
                let token = read_opencode_token(minimax::OPENCODE_KEY)
                    .ok_or("opencode minimax token not found")?;
                let mut usage = minimax::fetch_with_token(&token)?;
                usage.agent = "opencode".to_string();
                Ok(usage)
            }
            Upstream::Unknown => Err("model does not map to a known upstream quota".into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_known_prefixes() {
        assert_eq!(
            classify(Some("synthetic/gpt-oss-120b")),
            Upstream::Synthetic
        );
        assert_eq!(classify(Some("moonshotai/kimi-k2")), Upstream::Kimi);
        assert_eq!(classify(Some("zai/glm-4.5")), Upstream::Zai);
        assert_eq!(classify(Some("zhipuai/glm-4-plus")), Upstream::Zai);
        assert_eq!(classify(Some("github-copilot/gpt-4o")), Upstream::Copilot);
        assert_eq!(classify(Some("minimax/MiniMax-M*")), Upstream::MiniMax);
        assert_eq!(classify(Some("minimaxi/MiniMax-M2")), Upstream::MiniMax);
        assert_eq!(
            classify(Some("anthropic/claude-sonnet-4")),
            Upstream::Unknown
        );
        assert_eq!(classify(None), Upstream::Unknown);
    }

    #[test]
    fn classify_loose_keyword() {
        assert_eq!(classify(Some("some-kimi-variant")), Upstream::Kimi);
        assert_eq!(classify(Some("custom-glm-model")), Upstream::Zai);
        assert_eq!(classify(Some("my-zai-custom")), Upstream::Zai);
        assert_eq!(classify(Some("vendor-z-ai-plan")), Upstream::Zai);
    }
}
