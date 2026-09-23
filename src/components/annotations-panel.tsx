"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ANNOTATION_COLORS,
  type Annotation,
} from "@/lib/annotations";

type AnnotationsPanelProps = {
  annotations: Annotation[];
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (id: string) => void;
  onAddAnnotation: () => void;
  onEditAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  readOnly?: boolean;
};

export function AnnotationsPanel({
  annotations,
  activeAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  readOnly = false,
}: AnnotationsPanelProps) {
  return (
    <div className="flex flex-col">
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-border/80 px-3.5 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Annotations
          </h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-700/10 px-1.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
            {annotations.length}
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={onAddAnnotation}
            className="rap-btn-bronze inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xs active:scale-95"
            aria-label="Add Annotation"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Annotation</span>
          </button>
        )}
      </div>

      {/* Annotations List */}
      <div className="divide-y divide-border/60 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted">
            <p className="font-medium text-foreground/80">No annotations yet</p>
            <p className="mt-1">
              Highlight any lyric in the editor and click Annotate to break
              down your bars and wordplay.
            </p>
          </div>
        ) : (
          annotations.map((item) => {
            const colorMeta =
              ANNOTATION_COLORS[item.color] || ANNOTATION_COLORS.purple;
            const isActive = activeAnnotationId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnnotation?.(item.id)}
                className={`group cursor-pointer p-3.5 transition-all hover:bg-background/80 ${
                  isActive
                    ? "bg-accent/5 ring-1 ring-inset ring-amber-600/40"
                    : ""
                }`}
              >
                {/* Line / Word / Sentence and Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium leading-relaxed ${colorMeta.tagClass}`}
                      title={item.text}
                    >
                      {item.text}
                    </span>
                  </div>

                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-1 opacity-70 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAnnotation(item);
                        }}
                        className="rounded p-1 text-muted transition hover:bg-background hover:text-foreground"
                        title="Edit annotation"
                        aria-label="Edit annotation"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnnotation(item.id);
                        }}
                        className="rounded p-1 text-muted transition hover:bg-background hover:text-red-500"
                        title="Delete annotation"
                        aria-label="Delete annotation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {item.explanation}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
