import { apiClient } from './client';

export interface UsageWindow {
  label: string;
  percentage_remaining: number;
  resets_at: string | null;
  resets_in_seconds: number | null;
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
}

/**
 * Fetch agent usage quota. Returns `null` on any failure (404, network error,
 * parse error). A `null` return tells the caller to hide the quota badge.
 *
 * `force=true` bypasses the backend's 60s in-memory cache.
 */
export async function getAgentUsage(
  agent: string,
  force = false,
): Promise<AgentUsage | null> {
  try {
    const qs = force ? '?force=true' : '';
    return await apiClient.get<AgentUsage>(`/api/v1/agent-usage/${agent}${qs}`);
  } catch {
    return null;
  }
}
