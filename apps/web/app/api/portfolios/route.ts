import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const experienceId = searchParams.get("experienceId")

  const portfolios = await prisma.portfolio.findMany({
    where: experienceId ? { experienceId } : undefined,
    orderBy: { order: "asc" },
    include: {
      experience: { select: { id: true, company: true, role: true } },
      images: { orderBy: { order: "asc" } },
      tags: true,
    },
  })
  return NextResponse.json(portfolios)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, description, tags, experienceId, order, isPublished } = await req.json()
  
  const portfolio = await prisma.portfolio.create({
    data: {
      title,
      description,
      experienceId,
      order: order ?? 0,
      isPublished: isPublished ?? true,
      tags: tags ? {
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
  return NextResponse.json(portfolio, { status: 201 })
}
