import { prisma } from "@/lib/prisma";
import {
  isValidUsername,
  normalizeUsername,
  suggestUsernameFromEmail,
} from "@/lib/username";

export async function allocateUniqueUsername(seed: string): Promise<string> {
  let base = normalizeUsername(seed);
  if (!isValidUsername(base)) {
    base = suggestUsernameFromEmail(`${seed}@x.com`);
  }
  if (!isValidUsername(base)) base = "artist";

  for (let i = 0; i < 50; i++) {
    const candidate =
      i === 0 ? base : `${base.slice(0, 16)}_${i}`.slice(0, 20);
    if (!isValidUsername(candidate)) continue;
    const exists = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `user_${Date.now().toString(36)}`.slice(0, 20);
}
