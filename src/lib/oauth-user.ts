import { createSession, seedDefaultFolders } from "@/lib/auth";
import type { GoogleUserInfo } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

export class GoogleLinkError extends Error {
  code:
    | "GOOGLE_IN_USE"
    | "EMAIL_MISMATCH"
    | "ALREADY_LINKED"
    | "USER_NOT_FOUND";

  constructor(code: GoogleLinkError["code"]) {
    super(code);
    this.code = code;
  }
}

export async function linkGoogleToUser(userId: string, profile: GoogleUserInfo) {
  const googleId = profile.sub;
  const email = profile.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new GoogleLinkError("USER_NOT_FOUND");
  if (user.googleId) throw new GoogleLinkError("ALREADY_LINKED");

  const existingGoogle = await prisma.user.findUnique({ where: { googleId } });
  if (existingGoogle && existingGoogle.id !== userId) {
    throw new GoogleLinkError("GOOGLE_IN_USE");
  }

  if (user.email.toLowerCase() !== email) {
    throw new GoogleLinkError("EMAIL_MISMATCH");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleId,
      name: user.name ?? profile.name?.trim() ?? null,
    },
  });
}

export async function findOrCreateGoogleUser(profile: GoogleUserInfo) {
  const email = profile.email.toLowerCase().trim();
  const googleId = profile.sub;
  const name = profile.name?.trim() || null;

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId, name: existingByEmail.name ?? name },
      });
    } else {
      user = await prisma.user.create({
        data: { email, googleId, name },
      });
      await seedDefaultFolders(user.id);
    }
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return user;
}
