import { useState, useEffect, useRef } from "react";

interface TranscriptDialogProps {
  text: string | null;
  onSend: (text: string) => void;
  onCancel: () => void;
}

export default function TranscriptDialog({
  text,
  onSend,
  onCancel,
}: TranscriptDialogProps) {
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (text !== null) {
      setEditText(text);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [text]);

  if (text === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-[#1a1a20] border border-[#2a2a32] rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-wider text-[#6a6a78]">
          Edit before sending
        </span>
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={4}
          className="w-full bg-[#0e0e12] border border-[#2a2a32] rounded-lg px-3 py-2 text-sm text-[#c8c8d4] resize-none focus:outline-none focus:border-[#b49060]"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-xs text-[#6a6a78] hover:text-[#c8c8d4] px-4 py-2.5 min-h-[44px] rounded-lg border border-[#2a2a32] bg-[#141418] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(editText)}
            disabled={editText.trim().length === 0}
            className="text-xs text-[#b49060] px-4 py-2.5 min-h-[44px] rounded-lg border border-[#b49060]/30 bg-[#b49060]/10 hover:bg-[#b49060]/20 disabled:opacity-30 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
