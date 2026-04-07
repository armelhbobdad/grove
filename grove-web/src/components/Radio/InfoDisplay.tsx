import { useMemo } from "react";
import type { GroupSnapshot, ChatRef } from "../../data/types";

type TargetModeType = "chat" | "terminal";

interface InfoDisplayProps {
  group: GroupSnapshot | null;
  selectedPosition: number | null;
  activeChat: ChatRef | null;
  availableChats: ChatRef[];
  targetMode: TargetModeType;
  onTargetModeChange: (mode: TargetModeType) => void;
  onSelectChat: (chat: ChatRef) => void;
  isRecording: boolean;
  recordingElapsed: number;
  frequencyData: Uint8Array | null;
  isTranscribing: boolean;
  promptStatus: { status: "ok" | "error"; error?: string } | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Waveform({ frequencyData }: { frequencyData: Uint8Array | null }) {
  const bars = 28;
  const heights = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < bars; i++) {
      if (frequencyData && frequencyData.length > 0) {
        const index = Math.floor((i / bars) * frequencyData.length);
        const value = frequencyData[index];
        result.push(4 + (value / 255) * 28);
      } else {
        result.push(4);
      }
    }
    return result;
  }, [frequencyData]);

  return (
    <div className="flex h-7 items-end gap-[2px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 3,
            height: h,
            transition: "height 0.1s ease",
            backgroundColor: "var(--color-warning)",
          }}
        />
      ))}
    </div>
  );
}

export default function InfoDisplay({
  group,
  selectedPosition,
  activeChat,
  availableChats,
  targetMode,
  onTargetModeChange,
  onSelectChat,
  isRecording,
  recordingElapsed,
  frequencyData,
  isTranscribing,
  promptStatus,
}: InfoDisplayProps) {
  const slotStatus =
    group && selectedPosition !== null
      ? group.slot_statuses[selectedPosition] ?? null
      : null;

  const borderColor = isRecording
    ? "var(--color-warning)"
    : isTranscribing
      ? "var(--color-accent)"
      : "var(--color-border)";

  const statusLabel = isRecording
    ? "Recording"
    : isTranscribing
      ? "Transcribing..."
      : promptStatus
        ? promptStatus.status === "ok" ? "Sent" : "Error"
        : "Ready";

  const statusColor = isRecording
    ? "var(--color-warning)"
    : isTranscribing
      ? "var(--color-accent)"
      : promptStatus
        ? promptStatus.status === "ok" ? "var(--color-success)" : "var(--color-error)"
        : "var(--color-text-muted)";

  const hasSlot = slotStatus !== null;

  return (
    <div
      className="rounded-xl border px-3 py-2.5 transition-colors"
      style={{ borderColor, backgroundColor: "var(--color-bg)" }}
    >
      {/* Row 1: Status + task name + channel */}
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: statusColor }}>
            {statusLabel}
          </div>
          <div className="mt-0.5 truncate text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
            {slotStatus ? slotStatus.task_name : "No Channel Selected"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            CH
          </div>
          <div className="font-mono text-[18px] font-semibold leading-none" style={{ color: "var(--color-highlight)" }}>
            {selectedPosition !== null ? String(selectedPosition).padStart(2, "0") : "--"}
          </div>
        </div>
      </div>

      {/* Row 2: Mode tabs + session/terminal info */}
      {hasSlot && !isRecording && (
        <div className="mb-1.5">
          {/* Mode toggle: Chat / Terminal */}
          <div
            className="mb-1.5 grid grid-cols-2 rounded-lg border p-0.5"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
          >
            <button
              onClick={() => onTargetModeChange("chat")}
              className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-200"
              style={{
                color: targetMode === "chat" ? "var(--color-highlight)" : "var(--color-text-muted)",
                backgroundColor: targetMode === "chat" ? "color-mix(in srgb, var(--color-highlight) 15%, transparent)" : "transparent",
              }}
            >
              Chat
            </button>
            <button
              onClick={() => onTargetModeChange("terminal")}
              className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-200"
              style={{
                color: targetMode === "terminal" ? "var(--color-highlight)" : "var(--color-text-muted)",
                backgroundColor: targetMode === "terminal" ? "color-mix(in srgb, var(--color-highlight) 15%, transparent)" : "transparent",
              }}
            >
              Terminal
            </button>
          </div>

          {/* Chat mode: session dropdown */}
          {targetMode === "chat" && availableChats.length > 0 && (
            <select
              value={activeChat?.id ?? ""}
              onChange={(e) => {
                const chat = availableChats.find((c) => c.id === e.target.value);
                if (chat) onSelectChat(chat);
              }}
              className="w-full rounded-lg border px-2 py-1.5 text-[11px] font-medium appearance-none truncate"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                paddingRight: "24px",
              }}
            >
              {availableChats.map((chat) => (
                <option key={chat.id} value={chat.id}>
                  {chat.title ? `${chat.title} — ${chat.agent}` : chat.agent}
                </option>
              ))}
            </select>
          )}
          {targetMode === "chat" && availableChats.length === 0 && (
            <div className="px-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              No sessions available
            </div>
          )}

          {/* Terminal mode: simple label */}
          {targetMode === "terminal" && (
            <div className="px-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Voice input will be sent to terminal
            </div>
          )}
        </div>
      )}

      {/* Row 3: Recording waveform */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRecording ? (
            <div className="truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Recording...
            </div>
          ) : !hasSlot ? (
            <div className="truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              No session
            </div>
          ) : null}
        </div>

        {isRecording && (
          <div className="shrink-0 flex items-center gap-2">
            <Waveform frequencyData={frequencyData} />
            <span className="font-mono text-[11px]" style={{ color: "var(--color-warning)" }}>
              {formatTime(recordingElapsed)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
