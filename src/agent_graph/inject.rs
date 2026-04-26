//! Spec §6 注入格式：构造 agent-to-agent 注入消息的可见前缀。
//!
//! 这是给被注入方 AI 看的人类可读上下文。canonical sender 身份另由
//! `AcpCommand::Prompt.sender = Some("agent:<chat_id>")` / `QueuedMessage.sender`
//! 表达，前端 / 存储层用后者，prefix 仅是 prompt body 的一部分。

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
}

/// `[from:<sender_name> · session=<sender_chat_id> · kind=<send|reply>]\n\n<body>`
pub fn build_injected_prompt(
    sender_chat_id: &str,
    sender_name: &str,
    kind: InjectKind,
    body: &str,
) -> String {
    format!(
        "[from:{name} · session={id} · kind={kind}]\n\n{body}",
        name = sender_name,
        id = sender_chat_id,
        kind = kind.as_str(),
        body = body,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_send_prefix() {
        let s = build_injected_prompt("chat-aaa", "Frontend", InjectKind::Send, "hi");
        assert_eq!(s, "[from:Frontend · session=chat-aaa · kind=send]\n\nhi");
    }

    #[test]
    fn build_reply_prefix() {
        let s = build_injected_prompt("chat-bbb", "Backend", InjectKind::Reply, "done");
        assert_eq!(s, "[from:Backend · session=chat-bbb · kind=reply]\n\ndone");
    }
}
