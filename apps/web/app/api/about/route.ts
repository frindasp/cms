import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const about = await prisma.about.findFirst();
  return NextResponse.json(about);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { content, email, location } = body;

  const existing = await prisma.about.findFirst();

  let about;
  if (existing) {
    about = await prisma.about.update({
      where: { id: existing.id },
      data: { content, email, location },
    });
  } else {
    about = await prisma.about.create({
      data: { content, email, location },
    });
  }

  return NextResponse.json(about);
}
