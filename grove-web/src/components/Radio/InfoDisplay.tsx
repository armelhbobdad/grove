import type { GroupSnapshot, ChatRef } from "../../data/types";

interface InfoDisplayProps {
  group: GroupSnapshot | null;
  selectedPosition: number | null;
  activeChat: ChatRef | null;
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
  const bars = 24;
  const heights: number[] = [];

  for (let i = 0; i < bars; i++) {
    if (frequencyData && frequencyData.length > 0) {
      const index = Math.floor((i / bars) * frequencyData.length);
      const value = frequencyData[index];
      heights.push(4 + (value / 255) * 28);
    } else {
      heights.push(4);
    }
  }

  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {heights.map((h, i) => (
        <div
          key={i}
          className="bg-[#22c55e] opacity-70 rounded-sm"
          style={{ width: 3, height: h, transition: "height 0.1s ease" }}
        />
      ))}
    </div>
  );
}

export default function InfoDisplay({
  group,
  selectedPosition,
  activeChat,
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

  const borderClass = isRecording
    ? "border-[#22c55e]"
    : isTranscribing
      ? "border-[#b49060]"
      : "border-[#1e1e24]";

  return (
    <div
      className={`bg-[#0e0e12] border ${borderClass} rounded-lg px-4 py-3 sm:px-3 sm:py-2 transition-colors`}
    >
      {isRecording ? (
        /* ── Recording mode: replace entire content with waveform ── */
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-[9px] uppercase tracking-wider text-[#22c55e]">
              Recording
            </span>
            <span className="font-mono text-sm sm:text-[11px] text-[#22c55e] font-bold">
              {formatTime(recordingElapsed)}
            </span>
          </div>
          <Waveform frequencyData={frequencyData} />
          {slotStatus && (
            <div className="text-xs sm:text-[10px] text-[#6a6a78] truncate mt-1">
              → {slotStatus.task_name}
            </div>
          )}
        </>
      ) : isTranscribing ? (
        /* ── Transcribing mode ── */
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-[9px] uppercase tracking-wider text-[#b49060] animate-pulse">
              Transcribing...
            </span>
            {selectedPosition !== null && (
              <span className="font-mono text-sm sm:text-[11px] text-[#b49060] font-bold">
                CH-{selectedPosition}
              </span>
            )}
          </div>
          {slotStatus && (
            <div className="text-sm sm:text-xs text-[#c8c8d4] truncate">
              {slotStatus.task_name}
            </div>
          )}
        </>
      ) : (
        /* ── Normal mode: show selection info ── */
        <>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] sm:text-[9px] uppercase tracking-wider ${
              promptStatus
                ? promptStatus.status === "ok" ? "text-[#22c55e]" : "text-[#ef4444]"
                : "text-[#6a6a78]"
            }`}>
              {promptStatus
                ? promptStatus.status === "ok" ? "Sent" : (promptStatus.error ?? "Error")
                : "Selected"}
            </span>
            {selectedPosition !== null && (
              <span className="font-mono text-sm sm:text-[11px] text-[#b49060] font-bold">
                CH-{selectedPosition}
              </span>
            )}
          </div>

          {slotStatus ? (
            <div className="text-sm sm:text-xs text-[#c8c8d4] truncate">
              {slotStatus.task_name}
            </div>
          ) : (
            <div className="text-sm sm:text-xs text-[#3a3a44]">No channel selected</div>
          )}

          {activeChat && (
            <div className="text-xs sm:text-[10px] text-[#6a6a78] truncate mt-0.5">
              {activeChat.agent} - {activeChat.title}
            </div>
          )}
        </>
      )}
    </div>
  );
}
