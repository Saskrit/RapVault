"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ResizableSplitProps = {
  primary: ReactNode;
  secondary: ReactNode;
  secondaryVisible?: boolean;
  storageKey?: string;
  defaultSecondarySize?: number;
  minPrimary?: number;
  minSecondary?: number;
};

export function ResizableSplit({
  primary,
  secondary,
  secondaryVisible = true,
  storageKey = "rapvault-editor-split",
  defaultSecondarySize = 360,
  minPrimary = 280,
  minSecondary = 240,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(defaultSecondarySize);
  const [secondarySize, setSecondarySize] = useState(defaultSecondarySize);
  const [isDragging, setIsDragging] = useState(false);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    const parsed = Number(saved);
    if (!Number.isNaN(parsed) && parsed >= minSecondary) {
      sizeRef.current = parsed;
      setSecondarySize(parsed);
    }
  }, [storageKey, minSecondary]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsVertical(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    function onMove(event: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerSize = isVertical ? rect.height : rect.width;
      const raw = isVertical ? rect.bottom - event.clientY : rect.right - event.clientX;
      const maxSecondary = Math.max(minSecondary, containerSize - minPrimary);
      const next = Math.max(minSecondary, Math.min(maxSecondary, raw));

      sizeRef.current = next;
      setSecondarySize(next);
    }

    function onUp() {
      setIsDragging(false);
      localStorage.setItem(storageKey, String(sizeRef.current));
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, isVertical, minPrimary, minSecondary, storageKey]);

  if (!secondaryVisible) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {primary}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${isVertical ? "flex-col" : "flex-row"}`}
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={isVertical ? { minHeight: minPrimary } : { minWidth: minPrimary }}
      >
        {primary}
      </div>

      <div
        role="separator"
        aria-orientation={isVertical ? "horizontal" : "vertical"}
        aria-label="Resize panels"
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        className={`group z-10 shrink-0 touch-none select-none ${
          isVertical
            ? `h-2.5 w-full cursor-row-resize border-y border-border ${isDragging ? "bg-accent/15" : "bg-sidebar hover:bg-accent/10"}`
            : `w-2.5 cursor-col-resize border-x border-border ${isDragging ? "bg-accent/15" : "bg-sidebar hover:bg-accent/10"}`
        }`}
      >
        <div
          className={`rounded-full bg-border transition group-hover:bg-accent ${
            isVertical ? "mx-auto mt-[0.1875rem] h-1 w-14" : "ml-[0.1875rem] h-14 w-1"
          }`}
        />
      </div>

      <div
        className="min-h-0 shrink-0 overflow-hidden"
        style={
          isVertical
            ? { height: secondarySize, minHeight: minSecondary }
            : { width: secondarySize, minWidth: minSecondary }
        }
      >
        {secondary}
      </div>
    </div>
  );
}
