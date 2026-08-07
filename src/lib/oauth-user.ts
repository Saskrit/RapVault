import { createSession, seedDefaultFolders } from "@/lib/auth";
import type { GoogleUserInfo } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import {
  allocateUniqueUsername,
} from "@/lib/allocate-username";
import {
  suggestUsernameFromEmail,
} from "@/lib/username";

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
  const picture = profile.picture?.trim() || null;

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
      displayName:
        user.displayName ?? profile.name?.trim() ?? user.name ?? null,
      // Only fill avatar from Google when the user has none yet.
      ...(user.avatarUrl || !picture ? {} : { avatarUrl: picture }),
    },
  });
}

export async function findOrCreateGoogleUser(profile: GoogleUserInfo) {
  const email = profile.email.toLowerCase().trim();
  const googleId = profile.sub;
  const name = profile.name?.trim() || null;
  const picture = profile.picture?.trim() || null;

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail) {
      const username =
        existingByEmail.username ||
        (await allocateUniqueUsername(suggestUsernameFromEmail(email)));
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId,
          name: existingByEmail.name ?? name,
          displayName:
            existingByEmail.displayName ?? name ?? existingByEmail.name,
          username,
          ...(existingByEmail.avatarUrl || !picture
            ? {}
            : { avatarUrl: picture }),
        },
      });
    } else {
      const username = await allocateUniqueUsername(
        suggestUsernameFromEmail(email),
      );
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          name,
          displayName: name || email.split("@")[0] || "Artist",
          username,
          avatarUrl: picture,
        },
      });
      await seedDefaultFolders(user.id);
    }
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.displayName ?? user.name,
  });

  return user;
}
