import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "voice-memos");
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/mp3",
]);

export async function saveVoiceMemoFile(songId: string, file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error("Voice memo must be under 15 MB");
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported audio format");
  }

  const ext = extensionForType(file.type) ?? extensionFromName(file.name) ?? "webm";
  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${songId}.${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return filename;
}

export function absoluteVoiceMemoPath(filename: string) {
  return path.join(UPLOAD_DIR, filename);
}

export async function deleteVoiceMemoFile(filename: string) {
  if (!filename) return;
  try {
    await unlink(absoluteVoiceMemoPath(filename));
  } catch {
    /* file may already be gone */
  }
}

function extensionForType(type: string) {
  switch (type) {
    case "audio/webm":
      return "webm";
    case "audio/ogg":
      return "ogg";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    default:
      return null;
  }
}

function extensionFromName(name: string) {
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}
