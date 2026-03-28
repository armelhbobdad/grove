import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useDropdown } from "../../../hooks/useDropdown";
import type { ProviderProfile } from "../types";

export function ProfilePicker({
  label,
  profiles,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  profiles: ProviderProfile[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { containerRef, dropdownRef, isOpen, position, setIsOpen, triggerRef } = useDropdown();
  const selectedProfile = profiles.find((profile) => profile.id === value);

  return (
    <div className="w-full" ref={containerRef}>
      <label className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]">{label}</label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 opacity-60"
            : isOpen
              ? "border-[var(--color-highlight)] bg-[var(--color-highlight)]/6"
              : "border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-bg),var(--color-bg-secondary))] hover:border-[var(--color-text-muted)]"
        }`}
      >
        <div className="min-w-0 truncate text-sm font-medium text-[var(--color-text)]">
          {selectedProfile ? `${selectedProfile.name} · ${selectedProfile.model}` : "Select provider profile"}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && position
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: 9999,
              }}
              className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            >
              <div className="max-h-[320px] overflow-y-auto p-2">
                {profiles.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
                    No provider profiles configured.
                  </div>
                )}
                {profiles.map((profile) => {
                  const selected = profile.id === value;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        onChange(profile.id);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition-colors ${
                        selected ? "bg-[var(--color-highlight)]/10" : "hover:bg-[var(--color-bg-secondary)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--color-text)]">{profile.name}</div>
                        <div className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                          {profile.type} · {profile.model}
                        </div>
                      </div>
                      {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-highlight)]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
