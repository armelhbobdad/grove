import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Bot, Globe, Terminal, Settings } from "lucide-react";
import type { CustomAgent } from "../../api/config";

import { Claude, Gemini, Copilot, Cursor, Trae, Qwen, Kimi, OpenAI, Junie, OpenCode, OpenClaw, Hermes, Kiro, Windsurf } from "./AgentIcons";

interface AgentOption {
  id: string;
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  disabledReason?: string;
  /** Command to check in terminal mode (defaults to first word of value) */
  terminalCheck?: string;
  /** Command to check in chat/ACP mode */
  acpCheck?: string;
  /** Fallback ACP command (deprecated, still functional) */
  acpFallback?: string;
  /** npm package for npx fallback when acpCheck not on PATH */
  npxPackage?: string;
}

// Agent options with icons
// eslint-disable-next-line react-refresh/only-export-components
export const agentOptions: AgentOption[] = [
  { id: "claude", label: "Claude Code", value: "claude", icon: Claude.Color, terminalCheck: "claude", acpCheck: "claude-agent-acp", acpFallback: "claude-code-acp", npxPackage: "@agentclientprotocol/claude-agent-acp" },
  { id: "codex", label: "CodeX", value: "codex", icon: OpenAI, terminalCheck: "codex", acpCheck: "codex-acp", npxPackage: "@zed-industries/codex-acp" },
  { id: "cursor-agent", label: "Cursor", value: "cursor", icon: Cursor, terminalCheck: "cursor-agent", acpCheck: "cursor-agent" },
  { id: "gemini", label: "Gemini", value: "gemini", icon: Gemini.Color, terminalCheck: "gemini", acpCheck: "gemini" },
  { id: "gh-copilot", label: "GitHub Copilot", value: "copilot", icon: Copilot.Color, terminalCheck: "copilot", acpCheck: "copilot" },
  { id: "hermes", label: "Hermes", value: "hermes", icon: Hermes, terminalCheck: "hermes", acpCheck: "hermes acp" },
  { id: "junie", label: "Junie", value: "junie", icon: Junie.Color, terminalCheck: "junie", acpCheck: "junie" },
  { id: "kimi", label: "Kimi", value: "kimi", icon: Kimi.Color, terminalCheck: "kimi", acpCheck: "kimi" },
  { id: "kiro", label: "Kiro", value: "kiro", icon: Kiro, terminalCheck: "kiro-cli", acpCheck: "kiro-cli acp" },
  { id: "openclaw", label: "OpenClaw", value: "openclaw", icon: OpenClaw.Color, terminalCheck: "openclaw", acpCheck: "openclaw acp" },
  { id: "opencode", label: "OpenCode", value: "opencode", icon: OpenCode, terminalCheck: "opencode", acpCheck: "opencode" },
  { id: "qwen", label: "Qwen", value: "qwen", icon: Qwen.Color, terminalCheck: "qwen", acpCheck: "qwen" },
  { id: "traecli", label: "Trae", value: "traecli", icon: Trae.Color, terminalCheck: "traecli", acpCheck: "traecli" },
  { id: "windsurf", label: "Windsurf", value: "windsurf", icon: Windsurf, terminalCheck: "windsurf", acpCheck: "windsurf" },
];

interface AgentPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show "Custom command..." free-text input (Terminal mode) */
  allowCustom?: boolean;
  customPlaceholder?: string;
  options?: AgentOption[];
  /** ACP custom agents shown in dropdown (Chat mode) */
  customAgents?: CustomAgent[];
  /** Open the custom agent management modal (Chat mode) */
  onManageCustomAgents?: () => void;
  /**
   * Trigger button corner shape. Default `"rounded"` keeps the existing
   * `rounded-lg` look; `"pill"` switches to fully circular ends so the
   * picker fits inside pill-shaped surfaces (Graph toolbar).
   */
  triggerShape?: "rounded" | "pill";
  /**
   * Trigger size. `"default"` is the existing chunky look; `"compact"`
   * shrinks the height and font to match a 32-px input row so the picker
   * doesn't visually dominate alongside other controls in the same form.
   */
  triggerSize?: "default" | "compact";
}

interface DropdownPosition {
  /** Exactly one of `top` / `bottom` is set, depending on flip direction.
   *  When flipped, anchoring by `bottom` lets the menu hug the trigger from
   *  above regardless of how tall its actual content turns out to be — no
   *  giant gap when reserved maxHeight exceeds rendered content. */
  top: number | null;
  bottom: number | null;
  left: number;
  width: number;
  /** When true, the menu opens upward (its bottom edge sits above the
   *  trigger). Used by render to flip the entry animation direction. */
  flipped: boolean;
  /** Hard cap so the menu always fits within the side it picked. */
  maxHeight: number;
}

export function AgentPicker({
  value,
  onChange,
  placeholder = "Select agent...",
  allowCustom = true,
  customPlaceholder = "Enter agent command...",
  options: externalOptions,
  customAgents = [],
  onManageCustomAgents,
  triggerShape = "rounded",
  triggerSize = "default",
}: AgentPickerProps) {
  const displayOptions = externalOptions ?? agentOptions;
  const [isOpen, setIsOpen] = useState(false);

  // Check if current value matches any built-in option or custom agent
  const selectedOption = displayOptions.find((opt) => opt.value === value);
  const selectedCustomAgent = !selectedOption
    ? customAgents.find((a) => a.id === value)
    : null;
  const isCustomValue = value && !selectedOption && !selectedCustomAgent;

  // Initialize custom mode from initial props (lazy state initializer)
  const [isCustomMode, setIsCustomMode] = useState(() => !!(allowCustom && value && !displayOptions.find((opt) => opt.value === value) && !customAgents.find((a) => a.id === value)));
  const [customValue, setCustomValue] = useState(() => (allowCustom && value && !displayOptions.find((opt) => opt.value === value) && !customAgents.find((a) => a.id === value)) ? value : "");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position (fixed positioning, viewport-relative).
  // Auto-flips above the trigger when there isn't enough room below — needed
  // for use inside the bottom-floating Graph toolbar where the trigger sits
  // near the viewport edge.
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const gap = 4;
    const preferredHeight = 360; // matches the menu's max-height target
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const flipped = spaceBelow < Math.min(220, preferredHeight) && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      preferredHeight,
      Math.max(160, flipped ? spaceAbove - gap : spaceBelow - gap),
    );
    setDropdownPosition({
      top: flipped ? null : rect.bottom + gap,
      // Anchoring upward by `bottom` keeps the menu glued to the trigger
      // even when actual content is much shorter than `maxHeight`.
      bottom: flipped ? window.innerHeight - rect.top + gap : null,
      left: rect.left,
      width: Math.max(rect.width, 280),
      flipped,
      maxHeight,
    });
  }, []);

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when entering custom mode
  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  const handleSelect = (option: AgentOption | "custom") => {
    if (option === "custom") {
      setIsCustomMode(true);
      setCustomValue("");
      setIsOpen(false);
    } else {
      setIsCustomMode(false);
      onChange(option.value);
      setIsOpen(false);
    }
  };

  const handleSelectCustomAgent = (agentId: string) => {
    setIsCustomMode(false);
    onChange(agentId);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsOpen(false);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCustomSubmit();
    } else if (e.key === "Escape") {
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  const displayValue = isCustomMode
    ? customValue || customPlaceholder
    : selectedOption?.label || selectedCustomAgent?.name || (isCustomValue ? value : placeholder);

  const SelectedIcon = selectedOption?.icon;

  // Render dropdown using portal
  const renderDropdown = () => {
    if (!isOpen || isCustomMode || !dropdownPosition) return null;

    return createPortal(
      <AnimatePresence>
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: dropdownPosition.flipped ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: dropdownPosition.flipped ? 10 : -10 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            ...(dropdownPosition.top != null
              ? { top: dropdownPosition.top }
              : { bottom: dropdownPosition.bottom ?? 0 }),
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
            zIndex: 9999,
          }}
          className="py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-y-auto"
        >
          {/* Built-in agent options */}
          {displayOptions.map((option) => {
            const Icon = option.icon;
            const isDisabled = !!option.disabled;
            return (
              <button
                key={option.id}
                onClick={() => !isDisabled && handleSelect(option)}
                disabled={isDisabled}
                title={isDisabled ? option.disabledReason : undefined}
                className={`w-full flex items-center transition-colors ${
                  triggerSize === "compact"
                    ? "gap-2 px-2.5 py-1.5 text-[12.5px]"
                    : "gap-3 px-3 py-2.5 text-sm"
                }
                  ${isDisabled
                    ? "opacity-45 cursor-not-allowed"
                    : option.value === value
                      ? "bg-[var(--color-highlight)]/10 text-[var(--color-highlight)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
                  }`}
              >
                <div
                  className={`flex items-center justify-center flex-shrink-0 ${
                    triggerSize === "compact" ? "w-4 h-4" : "w-6 h-6"
                  }`}
                >
                  {Icon ? (
                    <Icon size={triggerSize === "compact" ? 14 : 20} />
                  ) : (
                    <Bot
                      className={
                        triggerSize === "compact"
                          ? "w-3.5 h-3.5 text-[var(--color-text-muted)]"
                          : "w-5 h-5 text-[var(--color-text-muted)]"
                      }
                    />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div>{option.label}</div>
                  <div
                    className={
                      triggerSize === "compact"
                        ? "text-[10px] text-[var(--color-text-muted)]"
                        : "text-xs text-[var(--color-text-muted)]"
                    }
                  >
                    {isDisabled ? option.disabledReason : option.value}
                  </div>
                </div>
                {!isDisabled && option.value === value && (
                  <Check
                    className={
                      triggerSize === "compact"
                        ? "w-3.5 h-3.5 flex-shrink-0"
                        : "w-4 h-4 flex-shrink-0"
                    }
                  />
                )}
              </button>
            );
          })}

          {/* ACP custom agents section (Chat mode) */}
          {customAgents.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 mt-1 border-t border-[var(--color-border)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Custom</span>
              </div>
              {customAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectCustomAgent(agent.id)}
                  className={`w-full flex items-center transition-colors ${
                    triggerSize === "compact"
                      ? "gap-2 px-2.5 py-1.5 text-[12.5px]"
                      : "gap-3 px-3 py-2.5 text-sm"
                  }
                    ${agent.id === value
                      ? "bg-[var(--color-highlight)]/10 text-[var(--color-highlight)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]"
                    }`}
                >
                  <div
                    className={`flex items-center justify-center flex-shrink-0 ${
                      triggerSize === "compact" ? "w-4 h-4" : "w-6 h-6"
                    }`}
                  >
                    {agent.type === "remote" ? (
                      <Globe
                        className={
                          triggerSize === "compact"
                            ? "w-3.5 h-3.5 text-[var(--color-info)]"
                            : "w-5 h-5 text-[var(--color-info)]"
                        }
                      />
                    ) : (
                      <Terminal
                        className={
                          triggerSize === "compact"
                            ? "w-3.5 h-3.5 text-[var(--color-text-muted)]"
                            : "w-5 h-5 text-[var(--color-text-muted)]"
                        }
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div>{agent.name}</div>
                    <div
                      className={
                        triggerSize === "compact"
                          ? "text-[10px] text-[var(--color-text-muted)]"
                          : "text-xs text-[var(--color-text-muted)]"
                      }
                    >
                      {agent.type === "remote" ? agent.url : agent.command}
                    </div>
                  </div>
                  {agent.id === value && (
                    <Check
                      className={
                        triggerSize === "compact"
                          ? "w-3.5 h-3.5 flex-shrink-0"
                          : "w-4 h-4 flex-shrink-0"
                      }
                    />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Footer actions: "Custom command..." OR "Manage Custom Agents..." */}
          {allowCustom && (
            <button
              onClick={() => handleSelect("custom")}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] mt-1"
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-[var(--color-text-muted)]" />
              </div>
              <span>Custom command...</span>
            </button>
          )}

          {onManageCustomAgents && (
            <button
              onClick={() => {
                setIsOpen(false);
                onManageCustomAgents();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] ${
                !allowCustom ? "border-t border-[var(--color-border)] mt-1" : ""
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-[var(--color-text-muted)]" />
              </div>
              <span>Manage Custom Agents...</span>
            </button>
          )}
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative">
        {/* Trigger button or custom input (Terminal mode free-text) */}
        {isCustomMode ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              onBlur={handleCustomSubmit}
              placeholder={customPlaceholder}
              className="flex-1 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-highlight)] rounded-lg
                text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm
                focus:outline-none focus:ring-1 focus:ring-[var(--color-highlight)]
                transition-all duration-200"
            />
            <button
              onClick={() => {
                setIsCustomMode(false);
                setIsOpen(true);
              }}
              className="px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg
                text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]
                transition-all duration-200"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            ref={triggerRef}
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center bg-[var(--color-bg-secondary)] border ${
              triggerShape === "pill" ? "rounded-full" : "rounded-lg"
            } ${
              triggerSize === "compact"
                ? "gap-2 px-3 h-8 text-[12.5px]"
                : "gap-3 px-3 py-2 text-sm"
            } transition-all duration-200
              ${isOpen
                ? "border-[var(--color-highlight)] ring-1 ring-[var(--color-highlight)]"
                : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
              }`}
          >
            <div
              className={`flex items-center justify-center flex-shrink-0 ${
                triggerSize === "compact" ? "w-4 h-4" : "w-5 h-5"
              }`}
            >
              {SelectedIcon ? (
                <SelectedIcon size={triggerSize === "compact" ? 14 : 18} />
              ) : selectedCustomAgent ? (
                selectedCustomAgent.type === "remote" ? (
                  <Globe
                    className={
                      triggerSize === "compact"
                        ? "w-3.5 h-3.5 text-[var(--color-info)]"
                        : "w-4 h-4 text-[var(--color-info)]"
                    }
                  />
                ) : (
                  <Terminal
                    className={
                      triggerSize === "compact"
                        ? "w-3.5 h-3.5 text-[var(--color-text-muted)]"
                        : "w-4 h-4 text-[var(--color-text-muted)]"
                    }
                  />
                )
              ) : (
                <Bot
                  className={
                    triggerSize === "compact"
                      ? "w-3.5 h-3.5 text-[var(--color-text-muted)]"
                      : "w-4 h-4 text-[var(--color-text-muted)]"
                  }
                />
              )}
            </div>
            <span className={`flex-1 text-left ${selectedOption || selectedCustomAgent || isCustomValue ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
              {displayValue}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown
                className={
                  triggerSize === "compact"
                    ? "w-3.5 h-3.5 text-[var(--color-text-muted)]"
                    : "w-4 h-4 text-[var(--color-text-muted)]"
                }
              />
            </motion.div>
          </button>
        )}

        {/* Dropdown rendered via portal */}
        {renderDropdown()}
      </div>
    </div>
  );
}
