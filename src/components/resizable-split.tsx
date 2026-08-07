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
  minSecondary = 240,
}: ResizableSplitProps) {
  const lockKey = `${storageKey}-locked`;
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef(defaultSecondarySize);
  const [secondarySize, setSecondarySize] = useState(defaultSecondarySize);
  const [isDragging, setIsDragging] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [locked, setLocked] = useState(false);

  const effectiveMinPrimary = isVertical ? Math.min(minPrimary, 140) : minPrimary;
  const effectiveMinSecondary = isVertical
    ? Math.min(minSecondary, 160)
    : minSecondary;

  useEffect(() => {
    const saved = preferenceStorageGet(storageKey);
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && parsed >= 120) {
        sizeRef.current = parsed;
        setSecondarySize(parsed);
      }
    }
    setLocked(preferenceStorageGet(lockKey) === "true");
  }, [storageKey, lockKey]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsVertical(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // On phones, keep the beat panel from eating the whole editor.
  useEffect(() => {
    if (!isVertical || !secondaryVisible) return;
    const container = containerRef.current;
    if (!container) return;

    function clamp() {
      const el = containerRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (h < 80) return;
      const maxSec = Math.max(effectiveMinSecondary, Math.floor(h * 0.42));
      const next = Math.max(
        effectiveMinSecondary,
        Math.min(maxSec, sizeRef.current),
      );
      if (next !== sizeRef.current) {
        sizeRef.current = next;
        setSecondarySize(next);
      }
    }

    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isVertical, secondaryVisible, effectiveMinSecondary]);

  useEffect(() => {
    if (!isDragging || locked) return;

    function onMove(event: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerSize = isVertical ? rect.height : rect.width;
      const raw = isVertical
        ? rect.bottom - event.clientY
        : rect.right - event.clientX;
      const maxSecondary = Math.max(
        effectiveMinSecondary,
        containerSize - effectiveMinPrimary,
      );
      const next = Math.max(
        effectiveMinSecondary,
        Math.min(maxSecondary, raw),
      );

      sizeRef.current = next;
      setSecondarySize(next);
    }

    function onUp() {
      setIsDragging(false);
      preferenceStorageSet(storageKey, String(sizeRef.current));
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
  }, [
    isDragging,
    isVertical,
    locked,
    effectiveMinPrimary,
    effectiveMinSecondary,
    storageKey,
  ]);

  function toggleLocked() {
    setLocked((prev) => {
      const next = !prev;
      preferenceStorageSet(lockKey, String(next));
      if (next) setIsDragging(false);
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
          setIsDragging(true);
        }}
        className={`group relative z-10 flex shrink-0 touch-none select-none items-center justify-center ${
          isVertical
            ? "h-10 w-full border-y border-border lg:h-8"
            : "w-8 border-x border-border"
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
          className={`absolute z-20 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted shadow-sm transition hover:border-accent hover:text-accent lg:h-7 lg:w-7 ${
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
            ? { height: secondarySize, minHeight: effectiveMinSecondary }
            : { width: secondarySize, minWidth: effectiveMinSecondary }
        }
      >
        {secondary}
      </div>
    </div>
  );
}
