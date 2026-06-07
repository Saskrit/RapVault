import { createSession, seedDefaultFolders } from "@/lib/auth";
import type { GoogleUserInfo } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

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
