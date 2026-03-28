import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDropdown } from "../../../hooks/useDropdown";

type LanguageOption = {
  id: string;
  label: string;
  value: string;
};

export function LanguageMultiSelect({
  label,
  options,
  value,
  onToggle,
  onAddCustom,
  disabled = false,
}: {
  label: string;
  options: LanguageOption[];
  value: string[];
  onToggle: (value: string) => void;
  onAddCustom: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const { containerRef, dropdownRef, isOpen, position, setIsOpen, triggerRef } = useDropdown();

  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const canAddCustom =
    query.trim().length > 0 &&
    ![...options.map((option) => option.value), ...value].some((item) => item.toLowerCase() === query.trim().toLowerCase());

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset search query on close
  useEffect(() => { if (!isOpen) setQuery(""); }, [isOpen]);

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
          {value.length > 0
            ? value.length <= 2
              ? value.join(", ")
              : `${value.slice(0, 2).join(", ")} +${value.length - 2}`
            : "Select preferred languages"}
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
              <div className="border-b border-[var(--color-border)] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search or add language"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-highlight)] focus:ring-1 focus:ring-[var(--color-highlight)]"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {canAddCustom ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAddCustom(query.trim());
                      setQuery("");
                    }}
                    className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--color-highlight)]/35 bg-[var(--color-highlight)]/6 px-3 py-2.5 text-left text-sm text-[var(--color-highlight)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add custom language "{query.trim()}"
                  </button>
                ) : null}
                {filteredOptions.map((option) => {
                  const checked = value.includes(option.value);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onToggle(option.value)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                        checked ? "bg-[var(--color-highlight)]/10" : "hover:bg-[var(--color-bg-secondary)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked
                            ? "border-[var(--color-highlight)] bg-[var(--color-highlight)]"
                            : "border-[var(--color-text-muted)]/40 bg-transparent"
                        }`}>
                          {checked && <Check className="h-3 w-3 text-[var(--color-bg)]" strokeWidth={3} />}
                        </div>
                        <span className="text-sm text-[var(--color-text)]">{option.label}</span>
                      </div>
                      {checked ? <Check className="h-4 w-4 text-[var(--color-highlight)]" /> : null}
                    </button>
                  );
                })}
                {filteredOptions.length === 0 && !canAddCustom ? (
                  <div className="px-3 py-6 text-sm text-[var(--color-text-muted)]">No languages match this search.</div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
