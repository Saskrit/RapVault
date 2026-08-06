import { NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    } = {};

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
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        displayName: updated.displayName,
        username: updated.username,
        bio: updated.bio,
        profilePublic: updated.profilePublic,
        recoveryEmail: updated.recoveryEmail,
        hasPassword: Boolean(updated.password),
        hasGoogle: Boolean(updated.googleId),
        createdAt: updated.createdAt.toISOString(),
        needsUsername: !updated.username,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update profile" },
      { status: 500 },
    );
  }
}
