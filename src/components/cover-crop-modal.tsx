"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CoverCropModalProps = {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const VIEW_W = 480;
const VIEW_H = 160;
const OUT_W = 1500;
const OUT_H = 500;

export function CoverCropModal({
  open,
  file,
  onCancel,
  onConfirm,
}: CoverCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!open || !file) {
      setSrc(null);
      setNatural({ w: 0, h: 0 });
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const coverScale = useMemo(() => {
    if (!natural.w || !natural.h) return 1;
    return Math.max(VIEW_W / natural.w, VIEW_H / natural.h);
  }, [natural]);

  const displayScale = coverScale * zoom;
  const drawnW = natural.w * displayScale;
  const drawnH = natural.h * displayScale;

  if (!open || !file || !src) return null;

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natural.w || !file) return;

    const left = (VIEW_W - drawnW) / 2 + offset.x;
    const top = (VIEW_H - drawnH) / 2 + offset.y;
    const sx = (0 - left) / displayScale;
    const sy = (0 - top) / displayScale;
    const sW = VIEW_W / displayScale;
    const sH = VIEW_H / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, OUT_W, OUT_H);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;

    const base = file.name.replace(/\.[^.]+$/, "") || "cover";
    onConfirm(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close crop"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crop cover photo"
        className="relative z-[1] w-full max-w-xl rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold tracking-tight">Crop cover</h2>
        <p className="mt-1 text-sm text-muted">
          Drag to reposition. Use the slider to zoom. Recommended 3:1.
        </p>

        <div
          className="relative mx-auto mt-5 max-w-full overflow-hidden rounded-xl border border-border bg-background"
          style={{ width: VIEW_W, height: VIEW_H, maxWidth: "100%" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className={`pointer-events-none absolute select-none ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              width: drawnW || undefined,
              height: drawnH || undefined,
              left: (VIEW_W - drawnW) / 2 + offset.x,
              top: (VIEW_H - drawnH) / 2 + offset.y,
              maxWidth: "none",
            }}
          />
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm text-muted">
          <span className="w-12 shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-border text-sm font-semibold transition hover:border-foreground/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!natural.w}
            className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            Use cover
          </button>
        </div>
      </div>
    </div>
  );
}
