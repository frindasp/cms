import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const experiences = await prisma.experience.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(experiences);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const experience = await prisma.experience.create({ data: body });
  return NextResponse.json(experience, { status: 201 });
}
