/**
 * Single source of truth for "given an agent key, what icon do I render?"
 *
 * The codebase has at least four conventions for naming agents:
 *   - `agentOptions[].value` (e.g. "claude", "codex") — the spawn / config key
 *   - `agentOptions[].id`    (e.g. "claude", "codex", "gh-copilot")
 *   - skills builtin `id`   (e.g. "claude-code", "gemini-cli")
 *   - skills builtin `icon_id` (e.g. "claude", "openai")
 *   - the static svg filename under `/agent-icon/`
 *
 * Every place that wants an icon used to re-implement the lookup with
 * inconsistent fallbacks. This module normalizes the input, returns:
 *   - a static URL for raw-DOM use (image chips, hover cards, etc.)
 *   - a React component for JSX use (mirrors `agentOptions[].icon`)
 *   - a friendly label
 *
 * Adding a new agent: add a row to `AGENT_TABLE`. That's it. Both the static
 * URL and the React component come for free; downstream call sites don't
 * change.
 */

import type { ComponentType } from "react";
import { Bot } from "lucide-react";
import {
  Claude,
  Gemini,
  Copilot,
  Cursor,
  Trae,
  Qwen,
  Kimi,
  OpenAI,
  Junie,
  OpenCode,
  OpenClaw,
  Hermes,
  Kiro,
  Windsurf,
} from "../components/ui/AgentIcons";

export interface AgentIconInfo {
  /** React component rendering the brand icon. Falls back to lucide `Bot`
   *  for unknown keys so consumers always get something renderable. */
  Component: ComponentType<{ size?: number; className?: string }>;
  /** Direct path to the static SVG, or `null` when no static asset exists. */
  url: string | null;
  /** Human-readable label, e.g. "Claude Code", "CodeX". */
  label: string;
  /** Canonical agent key — the value an `agentOptions` row would carry.
   *  Useful for downstream code that needs a stable id (e.g. metadata
   *  payloads). */
  canonicalKey: string;
}

interface AgentRow {
  /** Canonical key — what `agentOptions[].value` uses. */
  key: string;
  label: string;
  /** Filename under `/agent-icon/`, no path. `null` if no static asset. */
  staticFile: string | null;
  /** React component reference (or `null` to fall back to `Bot`). */
  Component: ComponentType<{ size?: number; className?: string }> | null;
  /** Extra strings that should resolve to this row (skills ids, legacy ids,
   *  icon_id values, alternate filenames, etc.). */
  aliases?: string[];
}

const AGENT_TABLE: AgentRow[] = [
  {
    key: "claude",
    label: "Claude Code",
    staticFile: "claude-color.svg",
    Component: Claude.Color,
    aliases: ["claude-code", "claude-color"],
  },
  {
    key: "codex",
    label: "CodeX",
    staticFile: "openai.svg",
    Component: OpenAI,
    aliases: ["openai"],
  },
  {
    key: "gemini",
    label: "Gemini",
    staticFile: "gemini-color.svg",
    Component: Gemini.Color,
    aliases: ["gemini-cli", "gemini-color"],
  },
  {
    key: "cursor",
    label: "Cursor",
    staticFile: "cursor.svg",
    Component: Cursor,
    aliases: ["cursor-agent"],
  },
  {
    key: "copilot",
    label: "GitHub Copilot",
    staticFile: "githubcopilot.svg",
    Component: Copilot.Color,
    aliases: ["gh-copilot", "githubcopilot"],
  },
  {
    key: "hermes",
    label: "Hermes",
    staticFile: "hermes.svg",
    Component: Hermes,
  },
  {
    key: "junie",
    label: "Junie",
    staticFile: "junie-color.svg",
    Component: Junie.Color,
    aliases: ["junie-color"],
  },
  {
    key: "kimi",
    label: "Kimi",
    staticFile: "kimi-color.svg",
    Component: Kimi.Color,
    aliases: ["kimi-color"],
  },
  {
    key: "kiro",
    label: "Kiro",
    staticFile: "kiro.svg",
    Component: Kiro,
    aliases: ["kiro-cli"],
  },
  {
    key: "openclaw",
    label: "OpenClaw",
    staticFile: "openclaw-color.svg",
    Component: OpenClaw.Color,
    aliases: ["openclaw-color"],
  },
  {
    key: "opencode",
    label: "OpenCode",
    staticFile: "opencode.svg",
    Component: OpenCode,
  },
  {
    key: "qwen",
    label: "Qwen",
    staticFile: "qwen-color.svg",
    Component: Qwen.Color,
    aliases: ["qwen-color"],
  },
  {
    key: "traecli",
    label: "Trae",
    staticFile: "trae-color.svg",
    Component: Trae.Color,
    aliases: ["trae", "trae-color"],
  },
  {
    key: "windsurf",
    label: "Windsurf",
    staticFile: "windsurf.svg",
    Component: Windsurf,
  },
];

const TABLE_BY_KEY: Record<string, AgentRow> = (() => {
  const map: Record<string, AgentRow> = {};
  for (const row of AGENT_TABLE) {
    const keys = [row.key, ...(row.aliases ?? [])];
    for (const k of keys) {
      // Last-write-wins on collisions; aliases shouldn't collide in practice.
      map[k.toLowerCase()] = row;
    }
  }
  return map;
})();

const FALLBACK: AgentIconInfo = {
  Component: Bot,
  url: null,
  label: "",
  canonicalKey: "",
};

/**
 * Resolve any agent key (value / id / icon_id / alias) to the row that owns
 * it. Returns a sentinel info object with `Component = Bot` for unknown keys.
 */
export function resolveAgentIcon(key: string | null | undefined): AgentIconInfo {
  if (!key) return { ...FALLBACK };
  const row = TABLE_BY_KEY[key.toLowerCase()];
  if (!row) return { ...FALLBACK, label: key, canonicalKey: key };
  return {
    Component: row.Component ?? Bot,
    url: row.staticFile ? `/agent-icon/${row.staticFile}` : null,
    label: row.label,
    canonicalKey: row.key,
  };
}

/** Convenience for raw-DOM consumers: just the static URL or null. */
export function agentIconUrl(key: string | null | undefined): string | null {
  return resolveAgentIcon(key).url;
}

/** Convenience for React consumers that already have a key: returns the
 *  component to render. Always renderable (Bot fallback). */
export function agentIconComponent(
  key: string | null | undefined,
): ComponentType<{ size?: number; className?: string }> {
  return resolveAgentIcon(key).Component;
}
