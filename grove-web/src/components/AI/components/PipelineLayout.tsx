import type { ElementType, ReactNode } from "react";

export function PipelineSection({
  step,
  title,
  icon: Icon,
  enabled,
  onToggle,
  toggleDisabled = false,
  children,
}: {
  step: string;
  title: string;
  icon: ElementType;
  enabled?: boolean;
  onToggle?: () => void;
  toggleDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-highlight)]/12 text-[var(--color-highlight)]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-highlight)]">{step}</div>
              <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">{title}</h2>
            </div>
          </div>
          {typeof enabled === "boolean" && onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              disabled={toggleDisabled}
              aria-pressed={enabled}
              className={`inline-flex h-7 min-w-12 items-center rounded-full border px-1 transition-colors ${
                toggleDisabled
                  ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-secondary)] opacity-45"
                  : enabled
                    ? "justify-end border-[var(--color-highlight)]/50 bg-[var(--color-highlight)]/15"
                    : "justify-start border-[var(--color-border)] bg-[var(--color-bg)]"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full ${
                  enabled ? "bg-[var(--color-highlight)]" : "bg-[var(--color-text-muted)]/50"
                }`}
              />
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-6 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function FieldGroup({
  title,
  hint,
  inlineHint = false,
  children,
}: {
  title: string;
  hint?: string;
  inlineHint?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className={inlineHint ? "flex flex-wrap items-baseline gap-x-3 gap-y-1" : ""}>
        <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
        {hint ? (
          <div
            className={inlineHint
              ? "text-xs leading-5 text-[var(--color-text-muted)]"
              : "mt-1 text-xs leading-5 text-[var(--color-text-muted)]"}
          >
            {hint}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
