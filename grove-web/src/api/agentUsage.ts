import { apiClient } from './client';

export interface UsageWindow {
  label: string;
  percentage_remaining: number;
  resets_at: string | null;
  resets_in_seconds: number | null;
  /**
   * Total window duration in seconds (e.g. 18000 for a 5h window). Used to
   * compute the on-pace safe-guard line. May be undefined for open-ended
   * buckets that don't have a fixed reset cadence.
   */
  total_window_seconds?: number | null;
}

export interface ExtraInfo {
  label: string;
  value: string;
}

export interface AgentUsage {
  agent: string;
  plan: string | null;
  percentage_remaining: number;
  windows: UsageWindow[];
  extras?: ExtraInfo[];
  outdated: boolean;
  fetched_at: string | null;
  source: "fresh_cache" | "live" | "last_success_fallback";
}

/**
 * Fetch agent usage quota. Returns `null` on any failure (404, network error,
 * parse error). A `null` return tells the caller to hide the quota badge.
 *
 * `force=true` bypasses the backend's 60s in-memory cache.
 *
 * `model` is an optional hint for multi-provider agents (e.g. opencode) that
 * map different models to different upstream quota pools. Standalone agents
 * (claude/codex/gemini) ignore it server-side.
 */
export async function getAgentUsage(
  agent: string,
  force = false,
  model?: string,
): Promise<AgentUsage | null> {
  try {
    const params = new URLSearchParams();
    if (force) params.set('force', 'true');
    if (model) params.set('model', model);
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : '';
    return await apiClient.get<AgentUsage>(`/api/v1/agent-usage/${agent}${suffix}`);
  } catch {
    return null;
  }
}
