import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: { skills: { orderBy: { name: "asc" } } },
  })
  if (!experience) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(experience)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { skills: skillNames, ...rest } = await req.json()

  // Disconnect all existing skills, then reconnect with the new set
  const skillOps =
    skillNames != null
      ? {
          set: [], // clear existing
          connectOrCreate: (skillNames as string[]).map((name: string) => ({
            where: { name },
            create: { name },
          })),
        }
      : undefined

  const experience = await prisma.experience.update({
    where: { id },
    data: {
      ...rest,
      ...(skillOps ? { skills: skillOps } : {}),
    },
    include: { skills: { orderBy: { name: "asc" } } },
  })

  return NextResponse.json(experience)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.experience.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
