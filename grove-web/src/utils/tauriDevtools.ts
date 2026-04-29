/**
 * Bind keyboard shortcuts that toggle the Tauri WebView devtools.
 *
 * No-op outside Tauri (regular browser). Shortcuts:
 *   - macOS: Cmd+Opt+I
 *   - Win/Linux: Ctrl+Shift+I
 *   - Cross-platform: F12
 */

type TauriInternals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function getTauriInternals(): TauriInternals | null {
  const w = window as Window & { __TAURI_INTERNALS__?: TauriInternals };
  return w.__TAURI_INTERNALS__ ?? null;
}

export function installTauriDevtoolsShortcut(): () => void {
  const tauri = getTauriInternals();
  if (!tauri) return () => {};

  const handler = (e: KeyboardEvent) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const isF12 = e.key === "F12";
    const isMacShortcut = isMac && e.metaKey && e.altKey && (e.key === "i" || e.key === "I" || e.code === "KeyI");
    const isWinShortcut = !isMac && e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I" || e.code === "KeyI");
    if (!isF12 && !isMacShortcut && !isWinShortcut) return;
    e.preventDefault();
    e.stopPropagation();
    tauri.invoke("toggle_devtools").catch((err) => {
      console.error("[devtools] toggle failed:", err);
    });
  };

  window.addEventListener("keydown", handler, true);
  return () => window.removeEventListener("keydown", handler, true);
}
