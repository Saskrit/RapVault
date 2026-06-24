import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  absoluteVoiceMemoPath,
  deleteVoiceMemoFile,
  saveVoiceMemoFile,
  voiceMemoApiPath,
} from "@/lib/voice-memo";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedSong(id: string, userId: string) {
  return prisma.song.findFirst({ where: { id, userId } });
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getOwnedSong(id, user.id);
  if (!song?.voiceMemoPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(absoluteVoiceMemoPath(song.voiceMemoPath));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypeForFilename(song.voiceMemoPath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getOwnedSong(id, user.id);
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    if (song.voiceMemoPath) {
      await deleteVoiceMemoFile(song.voiceMemoPath);
    }

    const filename = await saveVoiceMemoFile(id, file);
    const updated = await prisma.song.update({
      where: { id },
      data: { voiceMemoPath: filename },
      include: { folder: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      song: updated,
      voiceMemoUrl: voiceMemoApiPath(id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const song = await getOwnedSong(id, user.id);
  if (!song) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (song.voiceMemoPath) {
    await deleteVoiceMemoFile(song.voiceMemoPath);
  }

  const updated = await prisma.song.update({
    where: { id },
    data: { voiceMemoPath: "" },
    include: { folder: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ song: updated });
}

function contentTypeForFilename(filename: string) {
  if (filename.endsWith(".webm")) return "audio/webm";
  if (filename.endsWith(".ogg")) return "audio/ogg";
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".m4a")) return "audio/mp4";
  if (filename.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}
