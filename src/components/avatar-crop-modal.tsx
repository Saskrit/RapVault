"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AvatarCropModalProps = {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const OUTPUT_SIZE = 512;

export function AvatarCropModal({
  open,
  file,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState(280);
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

  useEffect(() => {
    if (!open) return;
    function sync() {
      setViewport(Math.min(280, Math.max(200, window.innerWidth - 48)));
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [open]);

  const coverScale = useMemo(() => {
    if (!natural.w || !natural.h) return 1;
    return Math.max(viewport / natural.w, viewport / natural.h);
  }, [natural, viewport]);

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

    const left = (viewport - drawnW) / 2 + offset.x;
    const top = (viewport - drawnH) / 2 + offset.y;
    const sx = (0 - left) / displayScale;
    const sy = (0 - top) / displayScale;
    const sSize = viewport / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;

    const base = file.name.replace(/\.[^.]+$/, "") || "avatar";
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
        aria-label="Crop profile photo"
        className="relative z-[1] w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5"
      >
        <h2 className="text-lg font-semibold tracking-tight">Crop photo</h2>
        <p className="mt-1 text-sm text-muted">
          Drag to reposition. Use the slider to zoom.
        </p>

        <div
          className="relative mx-auto mt-5 overflow-hidden rounded-full border border-border bg-background"
          style={{ width: viewport, height: viewport }}
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
              left: (viewport - drawnW) / 2 + offset.x,
              top: (viewport - drawnH) / 2 + offset.y,
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
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
