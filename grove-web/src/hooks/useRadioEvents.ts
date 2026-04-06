import { useCallback, useEffect, useRef, useState } from "react";
import type { RadioEvent } from "../api/walkieTalkie";
import { getApiHost, appendHmacToUrl } from "../api/client";

export interface RadioEventCallbacks {
  onFocusTask?: (projectId: string, taskId: string) => void;
  onPromptSent?: (projectId: string, taskId: string) => void;
}

const RECONNECT_DELAY = 3000;

/**
 * Hook for desktop Blitz to receive radio control events.
 * Connects to /radio/events/ws and forwards events to callbacks.
 * Returns the number of connected Radio clients (phones).
 */
export function useRadioEvents(callbacks: RadioEventCallbacks): { radioClients: number } {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [radioClients, setRadioClients] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(async () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = getApiHost();
    const url = await appendHmacToUrl(
      `${protocol}//${host}/api/v1/radio/events/ws`,
    );

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: RadioEvent = JSON.parse(event.data);
        switch (data.type) {
          case "focus_task":
            callbacksRef.current.onFocusTask?.(data.project_id, data.task_id);
            break;
          case "prompt_sent":
            callbacksRef.current.onPromptSent?.(data.project_id, data.task_id);
            break;
          case "client_connected":
            setRadioClients((prev) => prev + 1);
            break;
          case "client_disconnected":
            setRadioClients((prev) => Math.max(0, prev - 1));
            break;
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!intentionalCloseRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror
    };
  }, []);

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { radioClients };
}
