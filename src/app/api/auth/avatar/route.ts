import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteStoredAvatar, storeAvatar } from "@/lib/avatar-storage";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/public-user";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function extFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function normalizeType(file: File) {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED.has(type)) {
    return type === "image/jpg" ? "image/jpeg" : type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof Blob) || file.size <= 0) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const asFile = file as File;
    const contentType = normalizeType(asFile);
    if (!contentType) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 5MB" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.id },
      select: { avatarUrl: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await storeAvatar({
      userId: session.id,
      buffer,
      contentType,
      ext: extFor(contentType),
    });

    await deleteStoredAvatar(existing?.avatarUrl);

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
    const message =
      error instanceof Error && error.message.includes("CLOUDINARY_URL")
        ? "Cloudinary is not configured"
        : "Could not upload photo";
    return NextResponse.json({ error: message }, { status: 500 });
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

    await deleteStoredAvatar(existing?.avatarUrl);

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
