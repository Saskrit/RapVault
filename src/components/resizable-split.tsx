"use client";

import { Lock, Unlock } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  preferenceStorageGet,
  preferenceStorageSet,
} from "@/lib/safe-storage";

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
  minSecondary = 280,
}: ResizableSplitProps) {
  const lockKey = `${storageKey}-locked`;
  const sizeKeyH = `${storageKey}-h`;
  const sizeKeyV = `${storageKey}-v`;
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(defaultSecondarySize);
  const [secondarySize, setSecondarySize] = useState(defaultSecondarySize);
  const [isDragging, setIsDragging] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [locked, setLocked] = useState(false);
  const dragPointerId = useRef<number | null>(null);

  const effectiveMinPrimary = isVertical ? Math.min(minPrimary, 160) : minPrimary;
  const effectiveMinSecondary = isVertical
    ? Math.min(minSecondary, 140)
    : minSecondary;

  function activeSizeKey(vertical: boolean) {
    return vertical ? sizeKeyV : sizeKeyH;
  }

  function clampSize(raw: number, containerSize: number, vertical: boolean) {
    const minP = vertical ? Math.min(minPrimary, 160) : minPrimary;
    const minS = vertical ? Math.min(minSecondary, 140) : minSecondary;
    const maxSecondary = Math.max(minS, containerSize - minP);
    return Math.max(minS, Math.min(maxSecondary, raw));
  }

  useEffect(() => {
    setLocked(preferenceStorageGet(lockKey) === "true");
  }, [lockKey]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      const vertical = media.matches;
      setIsVertical(vertical);

      const key = activeSizeKey(vertical);
      const saved =
        preferenceStorageGet(key) ??
        // Migrate older single-key preference once.
        preferenceStorageGet(storageKey);
      const parsed = saved ? Number(saved) : defaultSecondarySize;
      const fallback = vertical
        ? Math.min(defaultSecondarySize, 220)
        : defaultSecondarySize;
      const next =
        !Number.isNaN(parsed) && parsed >= 120 ? parsed : fallback;
      sizeRef.current = next;
      setSecondarySize(next);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys derived from storageKey
  }, [storageKey, defaultSecondarySize, sizeKeyH, sizeKeyV]);

  // Keep size inside the container when the viewport/layout changes.
  useEffect(() => {
    if (!secondaryVisible) return;
    const container = containerRef.current;
    if (!container) return;

    function clampToContainer() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerSize = isVertical ? rect.height : rect.width;
      if (containerSize < 80) return;
      const next = clampSize(sizeRef.current, containerSize, isVertical);
      if (Math.abs(next - sizeRef.current) > 0.5) {
        sizeRef.current = next;
        setSecondarySize(next);
      }
    }

    clampToContainer();
    const observer = new ResizeObserver(clampToContainer);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVertical, secondaryVisible, minPrimary, minSecondary]);

  useEffect(() => {
    if (!isDragging || locked) return;

    function onMove(event: PointerEvent) {
      if (
        dragPointerId.current !== null &&
        event.pointerId !== dragPointerId.current
      ) {
        return;
      }
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerSize = isVertical ? rect.height : rect.width;
      const raw = isVertical
        ? rect.bottom - event.clientY
        : rect.right - event.clientX;
      const next = clampSize(raw, containerSize, isVertical);
      sizeRef.current = next;
      setSecondarySize(next);
    }

    function onUp(event: PointerEvent) {
      if (
        dragPointerId.current !== null &&
        event.pointerId !== dragPointerId.current
      ) {
        return;
      }
      dragPointerId.current = null;
      setIsDragging(false);
      preferenceStorageSet(
        activeSizeKey(isVertical),
        String(Math.round(sizeRef.current)),
      );
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isVertical, locked, minPrimary, minSecondary]);

  function toggleLocked() {
    setLocked((prev) => {
      const next = !prev;
      preferenceStorageSet(lockKey, String(next));
      if (next) {
        dragPointerId.current = null;
        setIsDragging(false);
      }
      return next;
    });
  }

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
        style={
          isVertical
            ? { minHeight: effectiveMinPrimary }
            : { minWidth: effectiveMinPrimary }
        }
      >
        {primary}
      </div>

      <div
        role="separator"
        aria-orientation={isVertical ? "horizontal" : "vertical"}
        aria-label={locked ? "Panel size locked" : "Resize panels"}
        aria-valuenow={Math.round(secondarySize)}
        onPointerDown={(event) => {
          if (locked) return;
          if ((event.target as HTMLElement).closest("button")) return;
          event.preventDefault();
          dragPointerId.current = event.pointerId;
          try {
            (event.currentTarget as HTMLElement).setPointerCapture(
              event.pointerId,
            );
          } catch {
            // Older browsers may not support capture.
          }
          setIsDragging(true);
        }}
        className={`group relative z-10 flex shrink-0 touch-none select-none items-center justify-center ${
          isVertical
            ? "h-8 w-full border-y border-border"
            : "w-3 border-x border-border lg:w-2"
        } ${isDragging ? "bg-accent/15" : "bg-sidebar hover:bg-accent/10"} ${
          locked
            ? "cursor-default"
            : isVertical
              ? "cursor-row-resize"
              : "cursor-col-resize"
        }`}
      >
        <div
          className={`pointer-events-none rounded-full bg-border transition group-hover:bg-accent ${
            isVertical ? "h-1 w-10" : "h-10 w-1"
          } ${locked ? "opacity-40" : ""}`}
        />
        <button
          type="button"
          onClick={toggleLocked}
          className={`absolute z-20 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted shadow-sm transition hover:border-accent hover:text-accent lg:h-7 lg:w-7 ${
            isVertical
              ? "right-2 top-1/2 -translate-y-1/2"
              : "bottom-2 left-1/2 -translate-x-1/2"
          } ${locked ? "border-accent/40 text-accent" : ""}`}
          aria-label={locked ? "Unlock panel size" : "Lock panel size"}
          title={locked ? "Unlock size" : "Lock size"}
        >
          {locked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div
        className="min-h-0 shrink-0 overflow-hidden"
        style={
          isVertical
            ? { height: secondarySize }
            : { width: secondarySize }
        }
      >
        {secondary}
      </div>
    </div>
  );
}
