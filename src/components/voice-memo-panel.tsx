"use client";

import { Mic, Square, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { voiceMemoApiPath } from "@/lib/voice-memo";

type VoiceMemoPanelProps = {
  songId: string;
  hasVoiceMemo: boolean;
  onUpdated: (voiceMemoPath: string) => void;
};

export function VoiceMemoPanel({ songId, hasVoiceMemo, onUpdated }: VoiceMemoPanelProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [memoVersion, setMemoVersion] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function uploadBlob(blob: Blob, filename: string) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", new File([blob], filename, { type: blob.type || "audio/webm" }));

      const res = await fetch(voiceMemoApiPath(songId), {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUpdated(data.song.voiceMemoPath);
      setMemoVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          await uploadBlob(blob, `memo-${songId}.webm`);
        }
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access is required to record.");
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;
    setRecording(false);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.name);
    event.target.value = "";
  }

  async function deleteMemo() {
    setUploading(true);
    setError("");
    try {
      const res = await fetch(voiceMemoApiPath(songId), { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      onUpdated("");
      setMemoVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUploading(false);
    }
  }

  const memoSrc =
    hasVoiceMemo ? `${voiceMemoApiPath(songId)}?v=${memoVersion}` : null;

  return (
    <div className="shrink-0 border-b border-border bg-card/40 px-3 py-2 lg:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Voice memo
        </span>

        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <Mic className="h-3.5 w-3.5" />
            Record
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 text-xs font-medium text-red-400"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </button>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recording}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>

        {hasVoiceMemo && (
          <button
            type="button"
            onClick={deleteMemo}
            disabled={uploading || recording}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {memoSrc && (
        <audio
          key={memoSrc}
          controls
          src={memoSrc}
          className="mt-2 h-10 w-full max-w-md"
          preload="metadata"
        />
      )}

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {uploading && <p className="mt-1.5 text-xs text-muted">Saving voice memo...</p>}
    </div>
  );
}
