import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET() {
  const experiences = await prisma.experience.findMany({
    orderBy: { order: "asc" },
    include: { skills: { orderBy: { name: "asc" } } },
  })
  return NextResponse.json(experiences)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { skills: skillNames = [], ...rest } = await req.json()

  // Upsert each skill by name, then connect
  const skillOps = (skillNames as string[]).map((name: string) => ({
    where: { name },
    create: { name },
  }))

  const experience = await prisma.experience.create({
    data: {
      ...rest,
      skills: { connectOrCreate: skillOps },
    },
    include: { skills: { orderBy: { name: "asc" } } },
  })

  return NextResponse.json(experience, { status: 201 })
}
