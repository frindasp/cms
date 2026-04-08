import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      experience: { select: { id: true, company: true, role: true } },
      images: { orderBy: { order: "asc" } },
      tags: true,
    },
  })
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(portfolio)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { title, description, tags, experienceId, order, isPublished } = await req.json()

  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: {
      title,
      description,
      experienceId,
      order,
      isPublished,
      tags: tags ? {
        set: [], // Clear existing
        connectOrCreate: tags.map((tag: string) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      } : undefined,
    },
    include: {
      experience: { select: { id: true, company: true, role: true } },
      images: true,
      tags: true,
    },
  })
  return NextResponse.json(portfolio)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.portfolio.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
