import { NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/public-user";
import {
  normalizeSocialUrl,
  SOCIAL_LINK_KEYS,
  type SocialLinkKey,
} from "@/lib/social-links";
import {
  isValidUsername,
  normalizeDisplayName,
  normalizeUsername,
} from "@/lib/username";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data: {
      displayName?: string;
      username?: string;
      bio?: string;
      profilePublic?: boolean;
    } & Partial<Record<SocialLinkKey, string>> = {};

    if (body.displayName !== undefined) {
      const displayName = normalizeDisplayName(body.displayName);
      if (!displayName) {
        return NextResponse.json(
          { error: "Display name is required" },
          { status: 400 },
        );
      }
      data.displayName = displayName;
    }

    if (body.username !== undefined) {
      const username = normalizeUsername(body.username);
      if (!isValidUsername(username)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3–20 characters: lowercase letters, numbers, underscores",
          },
          { status: 400 },
        );
      }

      const taken = await prisma.user.findFirst({
        where: { username, NOT: { id: session.id } },
      });
      if (taken) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 },
        );
      }
      data.username = username;
    }

    if (body.bio !== undefined) {
      data.bio =
        typeof body.bio === "string" ? body.bio.trim().slice(0, 280) : "";
    }

    if (body.profilePublic !== undefined) {
      data.profilePublic = Boolean(body.profilePublic);
    }

    for (const key of SOCIAL_LINK_KEYS) {
      if (body[key] !== undefined) {
        const normalized = normalizeSocialUrl(body[key]);
        if (normalized === null) {
          return NextResponse.json(
            { error: `Enter a valid ${key.replace("Url", "")} URL` },
            { status: 400 },
          );
        }
        data[key] = normalized;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data,
    });

    await createSession({
      id: updated.id,
      email: updated.email,
      name: updated.displayName ?? updated.name,
    });

    return NextResponse.json({
      user: toPublicUser(updated),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update profile" },
      { status: 500 },
    );
  }
}
