import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

// PATCH /api/skills/[id] — rename a skill
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const skill = await prisma.skill.update({
      where: { id },
      data: { name: name.trim() },
    })
    return NextResponse.json(skill)
  } catch {
    return NextResponse.json({ error: "Skill not found or name already taken" }, { status: 409 })
  }
}
