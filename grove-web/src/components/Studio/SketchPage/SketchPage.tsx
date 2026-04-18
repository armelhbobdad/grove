import { useCallback, useEffect, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useSketchList } from "./hooks/useSketchList";
import { useSketchSync } from "./hooks/useSketchSync";
import { SketchCanvas } from "./SketchCanvas";
import { SketchTabBar } from "./SketchTabBar";

interface Props {
  projectId: string;
  taskId: string;
}

export function SketchPage({ projectId, taskId }: Props) {
  const {
    sketches,
    loading: listLoading,
    create,
    remove,
    rename,
    refresh,
  } = useSketchList(projectId, taskId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [apiRef, setApiRef] = useState<ExcalidrawImperativeAPI | null>(null);

  const onIndexChanged = useCallback(() => {
    void refresh();
  }, [refresh]);

  const { scene, loading: sceneLoading, onLocalChange, remoteTick } = useSketchSync(
    projectId,
    taskId,
    activeId,
    onIndexChanged,
  );

  // Auto-select first sketch after list loads, and re-pick if active was deleted.
  useEffect(() => {
    if (!activeId && sketches.length > 0) {
      setActiveId(sketches[0].id);
    } else if (activeId && !sketches.find((s) => s.id === activeId)) {
      setActiveId(sketches[0]?.id ?? null);
    }
  }, [sketches, activeId]);

  const handleCreate = useCallback(async () => {
    try {
      const meta = await create(`Sketch ${sketches.length + 1}`);
      setActiveId(meta.id);
    } catch (e) {
      console.error("create sketch failed", e);
    }
  }, [create, sketches.length]);

  const handleExport = useCallback(async () => {
    if (!apiRef) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: apiRef.getSceneElements(),
        appState: apiRef.getAppState(),
        files: apiRef.getFiles(),
        mimeType: "image/png",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sketches.find((s) => s.id === activeId)?.name ?? "sketch"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("sketch export failed", e);
    }
  }, [apiRef, sketches, activeId]);

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--color-bg)" }}
    >
      <SketchTabBar
        sketches={sketches}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onDelete={remove}
        onRename={rename}
        onExportPng={handleExport}
      />
      <div className="flex-1 min-h-0">
        {listLoading ? (
          <CenterMessage>Loading…</CenterMessage>
        ) : sketches.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : sceneLoading || !activeId ? (
          <CenterMessage>Loading sketch…</CenterMessage>
        ) : (
          <SketchCanvas
            key={activeId}
            scene={scene}
            remoteTick={remoteTick}
            onChange={onLocalChange}
            onExcalidrawAPI={setApiRef}
          />
        )}
      </div>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center h-full text-sm"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <button
        type="button"
        onClick={onCreate}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
          background: "var(--color-bg-secondary)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-bg-tertiary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-bg-secondary)";
        }}
      >
        Create your first sketch
      </button>
    </div>
  );
}
