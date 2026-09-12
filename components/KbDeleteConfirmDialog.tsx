"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  topic: string;
  deleting: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function KbDeleteConfirmDialog({
  open,
  topic,
  deleting,
  error,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="kb-delete-overlay"
      role="presentation"
      onClick={() => {
        if (!deleting) onCancel();
      }}
    >
      <div
        className="kb-delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kb-delete-title"
        aria-describedby="kb-delete-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="kb-delete-title" className="kb-delete-title">Delete this knowledge base?</h2>
        <p id="kb-delete-desc" className="kb-delete-topic">{topic}</p>
        <p className="kb-delete-warning">
          This permanently removes indexed videos, chunks, and chat history. This cannot be undone.
        </p>
        {error && <p className="kb-delete-error">{error}</p>}
        <div className="kb-delete-actions">
          <button
            type="button"
            className="kb-delete-cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            Keep
          </button>
          <button
            type="button"
            className="kb-delete-confirm"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
