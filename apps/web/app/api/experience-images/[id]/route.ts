import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

// DELETE /api/experience-images/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const image = await prisma.experienceImage.findUnique({ where: { id } })
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Best-effort: delete from ImageKit
  if (image.source === "imagekit" && image.fileId) {
    try {
      const { default: ImageKit } = await import("@imagekit/nodejs")
      const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! })
      await ik.files.delete(image.fileId)
    } catch {
      // Non-fatal
    }
  }

  await prisma.experienceImage.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// PATCH /api/experience-images/[id] — update caption or order
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const image = await prisma.experienceImage.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(image)
}
