import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_PREFIX = "/uploads/avatars/";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercel() {
  return process.env.VERCEL === "1";
}

export async function storeAvatar(params: {
  userId: string;
  buffer: Buffer;
  contentType: string;
  ext: string;
}): Promise<string> {
  const { userId, buffer, contentType, ext } = params;
  const filename = `avatars/${userId}-${Date.now()}.${ext}`;

  if (hasBlobToken()) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  // Vercel has a read-only filesystem — persist as a data URL when Blob is not configured.
  if (isVercel()) {
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const diskName = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, diskName), buffer);
  return `${LOCAL_PREFIX}${diskName}`;
}

export async function deleteStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return;

  if (avatarUrl.startsWith("data:")) return;

  if (hasBlobToken() && /blob\.vercel-storage\.com/.test(avatarUrl)) {
    await del(avatarUrl).catch(() => {});
    return;
  }

  if (avatarUrl.startsWith(LOCAL_PREFIX)) {
    const oldPath = path.join(process.cwd(), "public", avatarUrl);
    await unlink(oldPath).catch(() => {});
  }
}
