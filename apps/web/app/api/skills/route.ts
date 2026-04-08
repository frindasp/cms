import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

// GET /api/skills — list all skills ordered alphabetically
export async function GET() {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(skills)
}

// POST /api/skills — create a new skill (upsert by name)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const skill = await prisma.skill.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  })

  return NextResponse.json(skill, { status: 201 })
}
