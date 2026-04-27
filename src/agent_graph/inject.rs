//! Spec §6 注入格式：构造 agent-to-agent 注入消息的 grove-meta 包装。
//!
//! 输出格式（统一 envelope，前端按 `type` 分发渲染）：
//!
//! ```text
//! <grove-meta>{"v":1,"type":"<type>","data":{...},"system-prompt":"..."}</grove-meta>
//!
//! <user body>
//! ```
//!
//! - `type` 决定前端 renderer。后端构造时只能从 [`agent_inject_send`,
//!   `agent_inject_reply`] 取值。
//! - `data` 字段是渲染元数据。
//! - `system-prompt` 是 AI / 用户能直接阅读的语义指令文本；前端不识别此 type 时
//!   会原样回退渲染这段文本。
//!
//! header + footer 合并到这一个 envelope 里 —— body 后面没有任何尾巴。

use serde::Serialize;
use serde_json::json;

#[derive(Debug, Clone, Copy)]
pub enum InjectKind {
    Send,
    Reply,
}

impl InjectKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Send => "send",
            Self::Reply => "reply",
        }
    }

    fn envelope_type(self) -> &'static str {
        match self {
            Self::Send => "agent_inject_send",
            Self::Reply => "agent_inject_reply",
        }
    }
}

/// `data` payload for `agent_inject_send` / `agent_inject_reply`.
#[derive(Debug, Serialize)]
struct InjectData<'a> {
    sid: &'a str,
    name: &'a str,
    /// Sender's underlying agent key (e.g. "claude", "codex"). Receiver uses
    /// this to render the brand icon. Empty string when unknown — frontend
    /// `agentIconComponent` handles unknown keys gracefully.
    agent: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    msg_id: Option<&'a str>,
}

/// Build the prompt body that gets injected into the recipient's session.
///
/// Format:
/// ```text
/// <grove-meta>{"v":1,"type":"agent_inject_send",...}</grove-meta>
///
/// <body>
/// ```
///
/// Reply variant has no msg_id field and no reply-instruction text.
pub fn build_injected_prompt(
    sender_chat_id: &str,
    sender_name: &str,
    sender_agent: &str,
    kind: InjectKind,
    body: &str,
    msg_id: Option<&str>,
) -> String {
    let system_prompt = match (kind, msg_id) {
        (InjectKind::Send, Some(id)) => format!(
            "From session \"{name}\" (id={sid}). To reply, call the MCP tool \
             `grove_agent_reply` with msg_id=\"{id}\". Do not reply by sending a \
             new message; replies are routed by msg_id.",
            name = sender_name,
            sid = sender_chat_id,
        ),
        (InjectKind::Send, None) => format!(
            "From session \"{name}\" (id={sid}).",
            name = sender_name,
            sid = sender_chat_id,
        ),
        (InjectKind::Reply, _) => format!(
            "From session \"{name}\" (id={sid}), replying to your earlier message.",
            name = sender_name,
            sid = sender_chat_id,
        ),
    };

    let payload = json!({
        "v": 1,
        "type": kind.envelope_type(),
        "data": InjectData {
            sid: sender_chat_id,
            name: sender_name,
            agent: sender_agent,
            msg_id: match kind {
                InjectKind::Send => msg_id,
                InjectKind::Reply => None,
            },
        },
        "system-prompt": system_prompt,
    });

    let envelope = serde_json::to_string(&payload).expect("envelope serializes");
    format!("<grove-meta>{envelope}</grove-meta>\n\n{body}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_envelope(s: &str) -> serde_json::Value {
        let inner = s
            .strip_prefix("<grove-meta>")
            .unwrap()
            .split_once("</grove-meta>")
            .unwrap()
            .0;
        serde_json::from_str(inner).unwrap()
    }

    #[test]
    fn build_send_with_msg_id_carries_full_metadata() {
        let s = build_injected_prompt(
            "chat-aaa",
            "Frontend",
            "claude",
            InjectKind::Send,
            "hi",
            Some("msg-1"),
        );
        let env = parse_envelope(&s);
        assert_eq!(env["v"], 1);
        assert_eq!(env["type"], "agent_inject_send");
        assert_eq!(env["data"]["sid"], "chat-aaa");
        assert_eq!(env["data"]["name"], "Frontend");
        assert_eq!(env["data"]["agent"], "claude");
        assert_eq!(env["data"]["msg_id"], "msg-1");
        let system_prompt = env["system-prompt"].as_str().unwrap();
        assert!(system_prompt.contains("grove_agent_reply"));
        assert!(system_prompt.contains("msg_id=\"msg-1\""));
        assert!(s.ends_with("\n\nhi"));
    }

    #[test]
    fn build_send_without_msg_id_omits_msg_id_field() {
        let s = build_injected_prompt(
            "chat-aaa",
            "Frontend",
            "claude",
            InjectKind::Send,
            "hi",
            None,
        );
        let env = parse_envelope(&s);
        assert_eq!(env["type"], "agent_inject_send");
        assert_eq!(env["data"]["agent"], "claude");
        assert!(env["data"].get("msg_id").is_none() || env["data"]["msg_id"].is_null());
        assert!(!env["system-prompt"]
            .as_str()
            .unwrap()
            .contains("grove_agent_reply"));
        assert!(s.ends_with("\n\nhi"));
    }

    #[test]
    fn build_reply_uses_reply_type_no_msg_id() {
        let s = build_injected_prompt(
            "chat-bbb",
            "Backend",
            "codex",
            InjectKind::Reply,
            "done",
            Some("msg-1"),
        );
        let env = parse_envelope(&s);
        assert_eq!(env["type"], "agent_inject_reply");
        assert_eq!(env["data"]["sid"], "chat-bbb");
        assert_eq!(env["data"]["name"], "Backend");
        assert_eq!(env["data"]["agent"], "codex");
        assert!(env["data"].get("msg_id").is_none() || env["data"]["msg_id"].is_null());
        assert!(s.ends_with("\n\ndone"));
    }

    #[test]
    fn envelope_escapes_quotes_in_name_and_body() {
        let s = build_injected_prompt(
            "chat-x",
            "Weird \"Name\" <ok>",
            "claude",
            InjectKind::Send,
            "body",
            Some("m1"),
        );
        let env = parse_envelope(&s);
        assert_eq!(env["data"]["name"], "Weird \"Name\" <ok>");
        assert!(env["system-prompt"]
            .as_str()
            .unwrap()
            .contains("Weird \"Name\" <ok>"));
    }

    #[test]
    fn body_is_not_inside_envelope() {
        let body = "before </grove-meta> after";
        let s = build_injected_prompt("c", "n", "claude", InjectKind::Send, body, None);
        let close_idx = s.find("</grove-meta>").unwrap();
        let body_idx = s.find("before").unwrap();
        assert!(body_idx > close_idx);
    }
}
