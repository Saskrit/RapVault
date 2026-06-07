"use client";

import { Modal } from "@/components/modal";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
            destructive
              ? "bg-red-600 hover:bg-red-500"
              : "bg-accent hover:bg-violet-500"
          }`}
        >
          {loading ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
