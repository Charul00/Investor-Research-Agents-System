"use client";

import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isBusy = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const isDanger = tone === "danger";

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="confirm-card">
        <div className="flex items-start justify-between gap-4">
          <div className={isDanger ? "confirm-icon is-danger" : "confirm-icon"}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="confirm-close"
            aria-label="Close confirmation"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">
          <p className="eyebrow mb-2">Please confirm</p>
          <h2 id="confirm-dialog-title" className="text-2xl font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={isBusy} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={isDanger ? "btn-danger-confirm" : "btn-primary"}
          >
            {isBusy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
