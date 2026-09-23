"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type Annotation,
  type AnnotationColor,
} from "@/lib/annotations";
import { Modal } from "@/components/modal";

type AddAnnotationModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    text: string;
    explanation: string;
    timestamp?: string;
    color: AnnotationColor;
    commentsCount?: number;
  }) => void;
  initialData?: Partial<Annotation> | null;
  selectedText?: string;
  currentVideoTime?: number | null;
  authorLabel?: string;
};

export function AddAnnotationModal({
  open,
  onClose,
  onSave,
  initialData,
  selectedText = "",
  currentVideoTime,
  authorLabel,
}: AddAnnotationModalProps) {
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [color, setColor] = useState<AnnotationColor>("amber");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setText(initialData?.text || selectedText || "");
    setExplanation(initialData?.explanation || "");
    setColor(initialData?.color || "amber");
    setError("");
  }, [open, initialData, selectedText]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please select or enter the lyric snippet to annotate.");
      return;
    }
    if (!explanation.trim()) {
      setError("Please enter an explanation or meaning for this annotation.");
      return;
    }

    onSave({
      id: initialData?.id,
      text: text.trim(),
      explanation: explanation.trim(),
      timestamp: initialData?.timestamp || undefined,
      color,
      commentsCount: initialData?.commentsCount ?? 1,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData?.id ? "Edit Annotation" : "Add Annotation"}
      description="Explain wordplay, hidden references, double entendres, or delivery notes."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lyric Snippet Field */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Lyric Snippet
          </label>
          <div className="relative rounded-xl border border-border bg-sidebar/50 p-2.5">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError("");
              }}
              rows={2}
              placeholder="Select lyrics from the editor or type here..."
              className="w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-foreground outline-none placeholder:text-muted"
            />
          </div>
        </div>

        {/* Explanation Field */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Meaning & Context
          </label>
          <textarea
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
              if (error) setError("");
            }}
            rows={3}
            autoFocus
            placeholder="Explain the rhyme scheme, punchline, cultural reference, or bar meaning..."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-foreground outline-none transition focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
          />
        </div>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted transition hover:bg-sidebar hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rap-btn-bronze inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold shadow-sm active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            {initialData?.id ? "Update Annotation" : "Save Annotation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
