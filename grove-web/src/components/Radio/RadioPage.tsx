import { useState, useCallback, useEffect, useRef } from "react";
import { useWalkieTalkie } from "../../hooks/useWalkieTalkie";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { transcribeAudio } from "../../api/ai";
import GroupSelector from "./GroupSelector";
import ChannelGrid from "./ChannelGrid";
import InfoDisplay from "./InfoDisplay";
import TranscriptDialog from "./TranscriptDialog";

export function RadioPage() {
  // Prevent zoom/double-tap on mobile for push-to-talk UX
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") ?? "";
    meta?.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover");
    return () => { meta?.setAttribute("content", original); };
  }, []);

  // Hooks
  const [state, actions] = useWalkieTalkie();
  const recorder = useAudioRecorder({ minDuration: 0.5, maxDuration: 60 });

  // Local state
  const [autoSend, setAutoSend] = useState(true);
  const [recordingPosition, setRecordingPosition] = useState<number | null>(
    null,
  );
  const [transcriptText, setTranscriptText] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<{
    groupId: string;
    position: number;
    chatId?: string;
  } | null>(null);

  // Refs to capture group/position at recording start (avoids stale closures)
  const recordingGroupRef = useRef<string | null>(null);
  const recordingPositionRef = useRef<number | null>(null);

  // Refs to track latest values for async callbacks (C1: stale closure fix)
  const connectedRef = useRef(state.connected);
  const activeChatRef = useRef(state.activeChat);
  const autoSendRef = useRef(autoSend);
  const groupsRef = useRef(state.groups);
  const isProcessingRef = useRef(false);

  useEffect(() => { connectedRef.current = state.connected; }, [state.connected]);
  useEffect(() => { activeChatRef.current = state.activeChat; }, [state.activeChat]);
  useEffect(() => { autoSendRef.current = autoSend; }, [autoSend]);
  useEffect(() => { groupsRef.current = state.groups; }, [state.groups]);

  // Prompt status feedback (auto-clears after 3 seconds)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visiblePromptStatus, setVisiblePromptStatus] = useState<
    typeof state.lastPromptStatus
  >(null);

  useEffect(() => {
    if (state.lastPromptStatus) {
      setVisiblePromptStatus(state.lastPromptStatus);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => {
        setVisiblePromptStatus(null);
      }, 3000);
    }
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [state.lastPromptStatus]);

  // Derived
  const currentGroup =
    state.groups.find((g) => g.id === state.currentGroupId) ?? null;

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleTap = useCallback(
    (position: number) => {
      if (state.currentGroupId) {
        actions.selectTask(state.currentGroupId, position);
      }
    },
    [state.currentGroupId, actions],
  );

  const handleHoldStart = useCallback(
    (position: number) => {
      // C2: Cancel any in-progress recording before starting a new one
      if (recorder.status === "recording") {
        recorder.cancel();
      }
      // C2: Block if transcription is still in progress
      if (isProcessingRef.current) return;

      if (state.currentGroupId) {
        actions.selectTask(state.currentGroupId, position);
      }
      recordingGroupRef.current = state.currentGroupId;
      recordingPositionRef.current = position;
      setRecordingPosition(position);
      recorder.start();
    },
    [state.currentGroupId, actions, recorder],
  );

  const handleHoldEnd = useCallback(
    (_position: number) => {
      const groupId = recordingGroupRef.current;
      const pos = recordingPositionRef.current;
      setRecordingPosition(null);
      isProcessingRef.current = true;
      recorder.stop().then(async (blob) => {
        if (!blob || !groupId || pos === null) {
          isProcessingRef.current = false;
          return;
        }

        setIsTranscribing(true);
        try {
          // C3: Pass project_id for project-specific audio settings (use ref for latest groups)
          const currentGroup = groupsRef.current.find((g) => g.id === groupId);
          const slot = currentGroup?.slots.find((s) => s.position === pos);
          const result = await transcribeAudio(blob, slot?.project_id);
          const text = result.final || result.revised || result.raw;

          // C1: Read latest values from refs instead of stale closure
          if (!connectedRef.current) {
            // WS disconnected — show transcript for manual retry
            setTranscriptText(text);
            setPendingPrompt({ groupId, position: pos, chatId: activeChatRef.current?.id });
          } else if (autoSendRef.current) {
            actions.sendPrompt(
              groupId,
              pos,
              text,
              activeChatRef.current?.id,
            );
            setTranscriptText(null);
            setPendingPrompt(null);
          } else {
            setTranscriptText(text);
            // M4: Capture groupId and chatId at recording time for later manual send
            setPendingPrompt({ groupId, position: pos, chatId: activeChatRef.current?.id });
          }
        } catch (err) {
          console.error("[Radio] Transcription failed:", err);
          setPendingPrompt(null);
        } finally {
          setIsTranscribing(false);
          isProcessingRef.current = false;
        }
      });
    },
    [recorder, actions],
  );

  const handleManualSend = useCallback(
    (text: string) => {
      // M4: Use captured groupId/position/chatId from recording time, not current state
      if (pendingPrompt) {
        actions.sendPrompt(
          pendingPrompt.groupId,
          pendingPrompt.position,
          text,
          pendingPrompt.chatId,
        );
      }
      setTranscriptText(null);
      setPendingPrompt(null);
    },
    [pendingPrompt, actions],
  );

  const handleClearTranscript = useCallback(() => {
    setTranscriptText(null);
    setPendingPrompt(null);
  }, []);

  // ── Volume key support (Task 12) ──────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.currentGroupId || state.currentPosition === null) return;

      if (e.key === "AudioVolumeUp" || e.key === "ArrowUp") {
        e.preventDefault();
        actions.switchChat(
          state.currentGroupId,
          state.currentPosition,
          "prev",
        );
      } else if (e.key === "AudioVolumeDown" || e.key === "ArrowDown") {
        e.preventDefault();
        actions.switchChat(
          state.currentGroupId,
          state.currentPosition,
          "next",
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.currentGroupId, state.currentPosition, actions]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] w-full bg-[#0c0c0c] flex flex-col overflow-hidden">
      {/* Full-screen flex container — stretches to fill entire viewport */}
      <div className="flex-1 flex flex-col w-full bg-gradient-to-b from-[#1a1a1f] to-[#111114] p-4 pb-[env(safe-area-inset-bottom)]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs sm:text-[11px] font-semibold tracking-[2px] text-[#525260] uppercase">
            GROVE RADIO
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#3a3a44]">
              {state.connected ? "" : "Connecting..."}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                state.connected ? "bg-[#22c55e]" : "bg-[#3a3a44] animate-pulse"
              }`}
            />
          </div>
        </div>

        {/* Group selector */}
        <div className="mb-3">
          <GroupSelector
            groups={state.groups}
            currentGroupId={state.currentGroupId}
            onSwitch={actions.switchGroup}
          />
        </div>

        {/* Info display */}
        <div className="mb-3">
          <InfoDisplay
            group={currentGroup}
            selectedPosition={state.currentPosition}
            activeChat={state.activeChat}
            isRecording={recorder.status === "recording"}
            recordingElapsed={recorder.elapsed}
            frequencyData={recorder.frequencyData}
            isTranscribing={isTranscribing}
            promptStatus={visiblePromptStatus}
          />
        </div>

        {/* Channel grid — grows to fill available space on mobile */}
        <div className="mb-3 flex-1 flex flex-col justify-center">
          <ChannelGrid
            group={currentGroup}
            selectedPosition={state.currentPosition}
            recordingPosition={recordingPosition}
            onTap={handleTap}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          />
        </div>

        {/* Auto send toggle */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-xs sm:text-[10px] text-[#6a6a78] uppercase tracking-wider">
            Auto send
          </span>
          <button
            onClick={() => setAutoSend((prev) => !prev)}
            className={`relative w-11 h-6 sm:w-9 sm:h-5 rounded-full transition-colors ${
              autoSend ? "bg-[#b49060]" : "bg-[#525260]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-white transition-transform ${
                autoSend ? "left-[22px] sm:left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

      </div>

      {/* Transcript edit dialog (when autoSend is off) */}
      <TranscriptDialog
        text={transcriptText}
        onSend={handleManualSend}
        onCancel={handleClearTranscript}
      />
    </div>
  );
}
