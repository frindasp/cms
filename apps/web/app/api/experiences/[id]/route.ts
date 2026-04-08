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
    include: {
      skills: { orderBy: { name: "asc" } },
      images: { orderBy: { order: "asc" } },
      portfolios: { 
        orderBy: { order: "asc" },
        include: { images: { orderBy: { order: "asc" } }, tags: true }
      },
    },
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
  const { skills: skillNames, imageUrl: _u, imageFileId: _f, ...rest } = await req.json()

  const skillOps =
    skillNames != null
      ? {
          set: [],
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
    include: {
      skills: { orderBy: { name: "asc" } },
      images: { orderBy: { order: "asc" } },
    },
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

  // Get all images to delete from ImageKit before deleting experience
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: { images: true },
  })

  if (experience?.images.length) {
    // Best-effort: delete images from ImageKit
    try {
      const { default: ImageKit } = await import("@imagekit/nodejs")
      const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! })
      
      const toDelete = experience.images.filter(img => img.source === "imagekit" && img.fileId)
      
      await Promise.allSettled(
        toDelete.map((img) => ik.files.delete(img.fileId!))
      )
    } catch {
      // Non-fatal
    }
  }

  await prisma.experience.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
