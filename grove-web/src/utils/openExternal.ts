/**
 * Open an external URL.
 *
 * In a regular browser:  delegates to window.open (target="_blank").
 * In Tauri GUI:          window.open/_blank is swallowed by the webview, so we
 *                        call tauri-plugin-shell's `open` command instead, which
 *                        forwards the URL to the OS default browser.
 */

type TauriInternals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function getTauriInternals(): TauriInternals | null {
  const w = window as Window & { __TAURI_INTERNALS__?: TauriInternals };
  return w.__TAURI_INTERNALS__ ?? null;
}

export function openExternalUrl(url: string): void {
  const tauri = getTauriInternals();
  if (tauri) {
    // tauri-plugin-shell exposes the "open" sub-command via invoke
    tauri.invoke("plugin:shell|open", { path: url }).catch((err: unknown) => {
      console.error("[openExternalUrl] Tauri shell open failed:", err);
      // Fallback: try window.open anyway
      window.open(url, "_blank", "noopener,noreferrer");
    });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
