"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ANNOTATION_COLORS,
  type Annotation,
} from "@/lib/annotations";

type AnnotationsPanelProps = {
  annotations: Annotation[];
  activeAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
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
  const activeItem = annotations.find((a) => a.id === activeAnnotationId);
  const activeColorMeta = activeItem
    ? ANNOTATION_COLORS[activeItem.color] || ANNOTATION_COLORS.purple
    : null;

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

      {/* Meaning of specific clicked annotated line/word */}
      {activeItem && activeColorMeta && (
        <div className="border-b border-border/80 bg-sidebar/50 p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Annotation Meaning
              </span>
            </div>
            {annotations.length > 1 && (
              <button
                type="button"
                onClick={() => onSelectAnnotation?.(null)}
                className="text-[11px] font-medium text-muted hover:text-foreground transition underline underline-offset-2"
              >
                View all ({annotations.length})
              </button>
            )}
          </div>

          {/* Line / Word / Sentence snippet */}
          <div className="mb-2.5">
            <span
              className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold leading-relaxed ${activeColorMeta.tagClass}`}
            >
              "{activeItem.text}"
            </span>
          </div>

          {/* Meaning / Description */}
          <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
            <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-normal">
              {activeItem.explanation}
            </p>
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div className="mt-2.5 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onEditAnnotation(activeItem)}
                className="rap-btn-secondary inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteAnnotation(activeItem.id)}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

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
          <>
            {activeItem && annotations.length > 1 && (
              <div className="bg-muted/20 px-3.5 py-1.5 text-[11px] font-semibold text-muted">
                All annotations in this track ({annotations.length})
              </div>
            )}
            {annotations.map((item) => {
              const colorMeta =
                ANNOTATION_COLORS[item.color] || ANNOTATION_COLORS.purple;
              const isActive = activeAnnotationId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectAnnotation?.(item.id)}
                  className={`group cursor-pointer p-3.5 transition-all hover:bg-background/80 ${
                    isActive
                      ? "bg-amber-500/10 border-l-2 border-l-amber-600 dark:border-l-amber-400"
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
            })}
          </>
        )}
      </div>
    </div>
  );
}
