import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { songs: true } },
    },
  });

  return NextResponse.json({ folders });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const maxOrder = await prisma.folder.aggregate({
    where: { userId: user.id },
    _max: { sortOrder: true },
  });

  const folder = await prisma.folder.create({
    data: {
      name: name.trim(),
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      userId: user.id,
    },
    include: { _count: { select: { songs: true } } },
  });

  return NextResponse.json({ folder });
}
