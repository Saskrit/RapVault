import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/public-user";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 2MB" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatarUrl: true },
    });

    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });

    const ext = extFor(file.type);
    const filename = `${session.id}-${Date.now()}.${ext}`;
    const diskPath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    if (existing?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(process.cwd(), "public", existing.avatarUrl);
      await unlink(oldPath).catch(() => {});
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: { avatarUrl },
    });

    return NextResponse.json({
      message: "Profile photo updated",
      user: toPublicUser(updated),
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Could not upload photo" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatarUrl: true },
    });

    if (existing?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(process.cwd(), "public", existing.avatarUrl);
      await unlink(oldPath).catch(() => {});
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({
      message: "Profile photo removed",
      user: toPublicUser(updated),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not remove photo" },
      { status: 500 },
    );
  }
}
