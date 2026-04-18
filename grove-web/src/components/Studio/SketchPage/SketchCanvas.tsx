import { useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

interface Props {
  scene: unknown | null;
  remoteTick: number;
  onChange: (next: unknown) => void;
  onExcalidrawAPI?: (api: ExcalidrawImperativeAPI) => void;
}

interface ExcalidrawScene {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export function SketchCanvas({ scene, remoteTick, onChange, onExcalidrawAPI }: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    if (!apiRef.current || !scene) return;
    // Re-apply the authoritative scene whenever a remote (agent) update arrives.
    const s = scene as ExcalidrawScene;
    apiRef.current.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: (s.elements ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appState: (s.appState ?? {}) as any,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteTick]);

  const initial = scene as ExcalidrawScene | null;
  return (
    <div className="w-full h-full">
      <Excalidraw
        initialData={
          initial
            ? {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                elements: (initial.elements ?? []) as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                appState: (initial.appState ?? {}) as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                files: (initial.files ?? {}) as any,
              }
            : undefined
        }
        excalidrawAPI={(api) => {
          apiRef.current = api;
          onExcalidrawAPI?.(api);
        }}
        onChange={(elements, appState, files) => {
          onChange({
            type: "excalidraw",
            version: 2,
            source: "grove",
            elements,
            appState,
            files,
          });
        }}
      />
    </div>
  );
}
