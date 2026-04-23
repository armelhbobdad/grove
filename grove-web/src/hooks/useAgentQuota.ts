import { useCallback, useEffect, useRef, useState } from 'react';

import { getAgentUsage, type AgentUsage } from '../api/agentUsage';

/**
 * Built-in agent IDs that support quota fetching. Custom agents and other
 * built-ins (Droid, Kimi, …) return `null` and the badge hides the quota.
 */
const SUPPORTED_AGENTS = new Set(['claude', 'codex', 'gemini']);

export interface UseAgentQuotaResult {
  usage: AgentUsage | null;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Fetch agent usage for the currently active agent.
 *
 * - On mount and whenever `agentId` changes, fetches once immediately.
 * - Re-fetches (non-forced, may hit backend 60s cache) each time the active
 *   chat transitions from busy to idle — i.e. right after a turn completes.
 * - `refresh()` forces a bypass of the backend cache (`?force=true`).
 *   Refresh calls are suppressed until the initial fetch for the current
 *   agent has started, avoiding a duplicate upstream hit on agent switch.
 * - Returns `null` for unsupported agent IDs and on any fetch failure —
 *   the UI then hides the quota badge entirely.
 */
export function useAgentQuota(
  agentId: string | null,
  busy: boolean = false,
): UseAgentQuotaResult {
  const [cached, setCached] = useState<AgentUsage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Tracks the latest request so late responses for a stale agent are ignored.
  const requestIdRef = useRef(0);
  // True once the effect-driven initial fetch for the current agent has been
  // kicked off — used to suppress a redundant `refresh()` racing the mount.
  const initialFetchStartedRef = useRef(false);

  const fetchData = useCallback(async (agent: string, force: boolean) => {
    if (!SUPPORTED_AGENTS.has(agent)) return;
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    try {
      const result = await getAgentUsage(agent, force);
      if (requestId !== requestIdRef.current) return; // stale
      setCached(result);
    } finally {
      // Always clear the flag for the *latest* request so the UI can never
      // get stuck in a "refreshing" state, even if a stale response returns
      // after a newer request was already completed.
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!agentId || !SUPPORTED_AGENTS.has(agentId)) {
      // Invalidate any in-flight request; the next render will hide the
      // badge because `cached.agent` won't match the new `agentId`.
      requestIdRef.current += 1;
      initialFetchStartedRef.current = false;
      return;
    }

    initialFetchStartedRef.current = true;
    void fetchData(agentId, false);
    return () => {
      requestIdRef.current += 1;
      initialFetchStartedRef.current = false;
    };
  }, [agentId, fetchData]);

  // Re-fetch whenever the chat transitions from busy → idle (a turn finished).
  const prevBusyRef = useRef(busy);
  useEffect(() => {
    const wasBusy = prevBusyRef.current;
    prevBusyRef.current = busy;
    if (!agentId || !SUPPORTED_AGENTS.has(agentId)) return;
    if (!initialFetchStartedRef.current) return;
    if (wasBusy && !busy) {
      void fetchData(agentId, false);
    }
  }, [busy, agentId, fetchData]);

  const refresh = useCallback(() => {
    // Ignore forced refreshes issued before the effect's initial fetch has
    // started — otherwise the effect and the refresh would fire two back-to-
    // back upstream requests on mount / agent switch.
    if (!agentId || !initialFetchStartedRef.current) return;
    void fetchData(agentId, true);
  }, [agentId, fetchData]);

  // Only surface the cached usage if it belongs to the current agent. This
  // prevents a stale quota from flashing on-screen during agent switch.
  const isActiveAgent = !!agentId && SUPPORTED_AGENTS.has(agentId);
  const usage = isActiveAgent && cached?.agent === agentId ? cached : null;
  const effectiveRefreshing = isActiveAgent ? refreshing : false;

  return { usage, refreshing: effectiveRefreshing, refresh };
}
