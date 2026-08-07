import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureCloudinary() {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error("CLOUDINARY_URL is not set");
  }
  if (!configured) {
    cloudinary.config({ cloudinary_url: url });
    configured = true;
  }
}

function isCloudinaryUrl(url: string) {
  return /res\.cloudinary\.com\//.test(url);
}

function publicIdFromUrl(url: string): string | null {
  // https://res.cloudinary.com/<cloud>/image/upload/v123/rapvault/avatars/userId.jpg
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match?.[1] ?? null;
}

export async function storeAvatar(params: {
  userId: string;
  buffer: Buffer;
  contentType: string;
  ext: string;
}): Promise<string> {
  ensureCloudinary();
  const { userId, buffer, contentType } = params;
  const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "rapvault/avatars",
    public_id: userId,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    transformation: [
      { width: 512, height: 512, crop: "fill", gravity: "auto" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });

  if (!result.secure_url) {
    throw new Error("Cloudinary did not return a URL");
  }

  return result.secure_url;
}

export async function deleteStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !isCloudinaryUrl(avatarUrl)) return;

  try {
    ensureCloudinary();
  } catch {
    return;
  }

  const publicId = publicIdFromUrl(avatarUrl);
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId).catch(() => {});
}
