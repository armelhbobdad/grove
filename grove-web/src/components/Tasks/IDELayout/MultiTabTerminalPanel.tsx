import { useCallback, useRef } from "react";
import { Plus, X } from "lucide-react";
import type { Task } from "../../../data/types";
import { XTerminal } from "../TaskDetail/XTerminal";
import { useTerminalTheme } from "../../../context";

export interface TerminalTab {
  id: string;
  label: string;
}

interface MultiTabTerminalPanelProps {
  projectId: string;
  task: Task;
  side: "left" | "right";
  /** Controlled tab list — owned by parent so it survives panel hide/show */
  tabs: TerminalTab[];
  activeId: string;
  onTabsChange: (tabs: TerminalTab[], activeId: string) => void;
  onClose?: () => void;
}

export function MultiTabTerminalPanel({
  projectId,
  task,
  side,
  tabs,
  activeId,
  onTabsChange,
  onClose,
}: MultiTabTerminalPanelProps) {
  const { terminalTheme } = useTerminalTheme();

  // Per-mount counter so new tabs get sequential labels from current max
  const counterRef = useRef(tabs.length);

  const addTab = useCallback(() => {
    counterRef.current += 1;
    const n = counterRef.current;
    const newTab: TerminalTab = {
      id: `term-${Date.now()}-${n}`,
      label: `Terminal (${n})`,
    };
    onTabsChange([...tabs, newTab], newTab.id);
  }, [tabs, onTabsChange]);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = tabs.filter((t) => t.id !== id);
    if (next.length === 0) {
      onClose?.();
      return;
    }
    const newActiveId =
      id === activeId
        ? next[Math.max(0, tabs.findIndex((t) => t.id === id) - 1)]?.id ?? next[0].id
        : activeId;
    onTabsChange(next, newActiveId);
  }, [tabs, activeId, onTabsChange, onClose]);

  const switchTab = useCallback((id: string) => {
    if (id !== activeId) onTabsChange(tabs, id);
  }, [tabs, activeId, onTabsChange]);

  return (
    <div className={`ide-panel-slot ide-panel-slot--${side} ide-panel-slot--terminal`}>
      {/* Tab bar */}
      <div className="ide-terminal-tabbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ide-terminal-tab ${tab.id === activeId ? "ide-terminal-tab--active" : ""}`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="ide-terminal-tab__label">{tab.label}</span>
            <span
              className="ide-terminal-tab__close"
              role="button"
              onClick={(e) => closeTab(tab.id, e)}
              title="Close terminal"
            >
              <X size={11} />
            </span>
          </button>
        ))}
        <button className="ide-terminal-tab-add" onClick={addTab} title="New terminal">
          <Plus size={13} />
        </button>
        <div className="ide-terminal-tabbar__spacer" />
        {onClose && (
          <button className="ide-terminal-tabbar__close" onClick={onClose} title="Close panel">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Only the active tab's XTerminal is mounted.
          Switching tabs causes the old one to unmount (XTerminal cache detaches WS)
          and the new one to mount (XTerminal cache reattaches WS). */}
      <div className="ide-panel-slot__body" style={{ backgroundColor: terminalTheme.colors.background }}>
        <XTerminal
          key={activeId}
          projectId={projectId}
          taskId={task.id}
          instanceId={activeId}
        />
      </div>
    </div>
  );
}
