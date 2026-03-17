import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await prisma.role.findMany();
  return NextResponse.json(roles);
}
