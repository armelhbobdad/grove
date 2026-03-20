import type { DirtyBranchError } from "../../hooks";
import { ConfirmDialog } from "./ConfirmDialog";

interface DirtyBranchDialogProps {
  error: DirtyBranchError | null;
  onClose: () => void;
}

export function DirtyBranchDialog({ error, onClose }: DirtyBranchDialogProps) {
  if (!error) return null;

  const title = `${error.operation} Blocked`;

  let mainMessage: React.ReactNode;
  let suggestion: string;

  if (error.isWorktree) {
    mainMessage = (
      <p>
        Task branch{" "}
        <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text)] font-mono text-xs">
          {error.branch}
        </code>{" "}
        has uncommitted changes.
      </p>
    );
    suggestion = "Please commit or stash your changes before retrying.";
  } else {
    mainMessage = (
      <p>
        The main repository has uncommitted changes.
      </p>
    );
    suggestion = "Please commit or stash your changes in the main repository first, then retry.";
  }

  return (
    <ConfirmDialog
      isOpen
      title={title}
      variant="warning"
      confirmLabel="OK"
      cancelLabel="Dismiss"
      onConfirm={onClose}
      onCancel={onClose}
      message={
        <div className="flex flex-col gap-3">
          {mainMessage}
          <p>{suggestion}</p>
        </div>
      }
    />
  );
}
