import { useRef, useCallback } from "react";
import type { GroupSnapshot } from "../../data/types";

interface ChannelGridProps {
  group: GroupSnapshot | null;
  selectedPosition: number | null;
  recordingPosition: number | null;
  onTap: (position: number) => void;
  onHoldStart: (position: number) => void;
  onHoldEnd: (position: number) => void;
}

interface ChannelButtonProps {
  position: number;
  taskName: string | null;
  agentStatus: "idle" | "busy" | "disconnected" | null;
  isSelected: boolean;
  isRecording: boolean;
  onTap: (position: number) => void;
  onHoldStart: (position: number) => void;
  onHoldEnd: (position: number) => void;
}

function ChannelButton({
  position,
  taskName,
  agentStatus,
  isSelected,
  isRecording,
  onTap,
  onHoldStart,
  onHoldEnd,
}: ChannelButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    if (taskName === null) return; // empty slot
    holdingRef.current = false;
    timerRef.current = setTimeout(() => {
      holdingRef.current = true;
      onHoldStart(position);
    }, 300);
  }, [position, taskName, onHoldStart]);

  const handlePointerUp = useCallback(() => {
    clearTimer();
    if (holdingRef.current) {
      holdingRef.current = false;
      onHoldEnd(position);
    } else if (taskName !== null) {
      onTap(position);
    }
  }, [position, taskName, clearTimer, onTap, onHoldEnd]);

  const handlePointerLeave = useCallback(() => {
    clearTimer();
    if (holdingRef.current) {
      holdingRef.current = false;
      onHoldEnd(position);
    }
  }, [position, clearTimer, onHoldEnd]);

  const isEmpty = taskName === null;

  const borderClass = isRecording
    ? "border-[#22c55e]"
    : isSelected
      ? "border-[#b49060]"
      : "border-[#2a2a32]";

  const shadowStyle = isRecording
    ? { boxShadow: "0 0 8px rgba(34, 197, 94, 0.3)" }
    : isSelected
      ? { boxShadow: "0 0 8px rgba(180, 144, 96, 0.3)" }
      : {};

  const numberColor = isRecording
    ? "text-[#22c55e]"
    : isSelected
      ? "text-[#b49060]"
      : "text-[#6a6a78]";

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none select-none flex flex-col items-center justify-center rounded-xl border ${borderClass} bg-gradient-to-b from-[#1a1a20] to-[#141418] p-3 transition-colors active:scale-[0.97] active:brightness-110`}
      style={shadowStyle}
    >
      <span className={`font-mono text-sm sm:text-[11px] font-bold ${numberColor}`}>
        {position}
      </span>
      {isEmpty ? (
        <span className="text-[#3a3a44] text-lg leading-none mt-1">+</span>
      ) : (
        <>
          <span className="text-xs sm:text-[10px] text-[#c8c8d4] truncate w-full text-center mt-1 leading-tight">
            {taskName}
          </span>
          <span
            className={`w-2 h-2 rounded-full mt-1 ${
              agentStatus === "busy"
                ? "bg-[#eab308] animate-pulse"
                : agentStatus === "idle"
                  ? "bg-[#22c55e]"
                  : "bg-[#3a3a44]"
            }`}
          />
        </>
      )}
    </button>
  );
}

export default function ChannelGrid({
  group,
  selectedPosition,
  recordingPosition,
  onTap,
  onHoldStart,
  onHoldEnd,
}: ChannelGridProps) {
  const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-3 flex-1">
      {positions.map((pos) => {
        const status = group?.slot_statuses[pos] ?? null;
        return (
          <ChannelButton
            key={pos}
            position={pos}
            taskName={status?.task_name ?? null}
            agentStatus={status?.agent_status ?? null}
            isSelected={selectedPosition === pos}
            isRecording={recordingPosition === pos}
            onTap={onTap}
            onHoldStart={onHoldStart}
            onHoldEnd={onHoldEnd}
          />
        );
      })}
    </div>
  );
}
