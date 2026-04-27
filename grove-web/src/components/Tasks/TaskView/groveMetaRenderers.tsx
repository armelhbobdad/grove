import { createElement, type ReactNode } from "react";
import { agentIconComponent } from "../../../utils/agentIcon";
import type { GroveMetaEnvelope } from "../../../utils/groveMeta";

/**
 * Single-tag, type-dispatched renderer for `<grove-meta>` envelopes.
 *
 * To add a new envelope type:
 *   1. Register a renderer in `GROVE_META_RENDERERS` keyed by the `type` string.
 *   2. (Optional) Add a TypeScript interface for the `data` shape.
 *
 * Unknown / unsupported `type` falls back to `envelope.systemPrompt`, so the
 * UI never crashes on schema drift between backend and frontend versions.
 */

type Renderer = (
  envelope: GroveMetaEnvelope,
  ctx: RenderContext,
) => ReactNode;

export interface RenderContext {
  /** Inline (within a paragraph) vs block (own line). Renderers can choose to
   *  render compactly when inline. */
  layout: "inline" | "block";
}

interface MentionSpawnData {
  agent: string;
}

interface MentionSendData {
  sid: string;
  name: string;
  duty?: string;
  /** Underlying agent key for the target session (renders the brand icon). */
  agent?: string;
}

interface MentionReplyData {
  sid: string;
  name: string;
  msg_id: string;
  agent?: string;
}

interface AgentInjectData {
  sid: string;
  name: string;
  msg_id?: string;
  agent?: string;
}

/**
 * Neutral pill style — readable in any theme. Type is conveyed by the brand
 * icon (and the small reply glyph for `mention_reply`), not by tinted color.
 */
const PILL_BASE =
  "inline-flex items-center gap-1 align-baseline rounded-md px-1.5 py-px text-[12px] font-medium leading-tight " +
  "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text)]";

/** Render `<muted-verb> <agent-icon> <name>` — verb leads (states the
 *  action), then the brand icon and the session name read together as the
 *  target. */
function pillWithVerb(
  agent: string | undefined,
  verb: string,
  name: string,
  title: string,
): ReactNode {
  const Icon = agentIconComponent(agent);
  return (
    <span className={PILL_BASE} title={title}>
      <span className="opacity-70 font-medium">{verb}</span>
      {createElement(Icon, { size: 12, className: "shrink-0" })}
      <span>{name}</span>
    </span>
  );
}

function renderMentionSpawn(env: GroveMetaEnvelope): ReactNode {
  const data = env.data as unknown as MentionSpawnData;
  return pillWithVerb(data.agent, "Spawn", data.agent, `Spawn ${data.agent}`);
}

function renderMentionSend(env: GroveMetaEnvelope): ReactNode {
  const data = env.data as unknown as MentionSendData;
  return pillWithVerb(
    data.agent,
    "Send To",
    data.name,
    data.duty ? `Send to ${data.name} — ${data.duty}` : `Send to ${data.name}`,
  );
}

function renderMentionReply(env: GroveMetaEnvelope): ReactNode {
  const data = env.data as unknown as MentionReplyData;
  return pillWithVerb(
    data.agent,
    "Reply To",
    data.name,
    `Reply to ${data.name}`,
  );
}

function renderAgentInjectBadge(
  env: GroveMetaEnvelope,
  variant: "send" | "reply",
): ReactNode {
  const data = env.data as unknown as AgentInjectData;
  const Icon = agentIconComponent(data.agent);
  // Receiver-side framing: this badge sits on a message that ARRIVED in the
  // current chat from another session, so the verb is "From", not "To".
  const verb = variant === "send" ? "Send From" : "Reply From";
  return (
    <div
      className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text)]"
      title={env.systemPrompt}
    >
      <span className="opacity-70">{verb}</span>
      {createElement(Icon, { size: 14, className: "shrink-0" })}
      <span className="truncate">{data.name}</span>
    </div>
  );
}

export const GROVE_META_RENDERERS: Record<string, Renderer> = {
  mention_spawn: (env) => renderMentionSpawn(env),
  mention_send: (env) => renderMentionSend(env),
  mention_reply: (env) => renderMentionReply(env),
  agent_inject_send: (env) => renderAgentInjectBadge(env, "send"),
  agent_inject_reply: (env) => renderAgentInjectBadge(env, "reply"),
};

/** Render an envelope, falling back to `systemPrompt` text on unknown type or
 *  renderer failure. */
export function renderGroveMetaEnvelope(
  envelope: GroveMetaEnvelope,
  ctx: RenderContext,
): ReactNode {
  if (envelope.v !== 1) return envelope.systemPrompt;
  const renderer = GROVE_META_RENDERERS[envelope.type];
  if (!renderer) return envelope.systemPrompt;
  try {
    return renderer(envelope, ctx);
  } catch {
    return envelope.systemPrompt;
  }
}
