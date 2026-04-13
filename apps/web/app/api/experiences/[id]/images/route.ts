import { NextResponse } from "next/server"
import { auth } from "@/auth"
import ImageKit from "@imagekit/nodejs"

/**
 * POST /api/experiences/[id]/images
 * Upload to ImageKit or save direct URL to ExperienceImage table.
 *
 * PATCH /api/experiences/[id]/images
 * Update image properties like isLogo.
 *
 * DELETE /api/experiences/[id]/images
 * Delete an ExperienceImage by its id and remove from ImageKit if source is imagekit.
 */

function getIK() {
  return new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: experienceId } = await params
  const { file, fileName, url, source = "imagekit", caption, isLogo = false } = await req.json()

  // Dynamic import
  const { prisma } = await import("@workspace/database")

  try {
    let finalUrl: string | undefined = url
    let fileId: string | null = null

    if (source === "imagekit" && file) {
      const ik = getIK()
      const result = await ik.files.upload({
        file,
        fileName,
        folder: "/experience",
        useUniqueFileName: true,
      })
      finalUrl = result.url
      fileId = result.fileId ?? null
    }

    if (!finalUrl) {
      return NextResponse.json({ error: "URL or file required" }, { status: 400 })
    }

    // If this is set as logo, unset other logos for this experience
    if (isLogo) {
      await prisma.experienceImage.updateMany({
        where: { experienceId, isLogo: true },
        data: { isLogo: false },
      })
    }

    const count = await prisma.experienceImage.count({ where: { experienceId } })

    const image = await prisma.experienceImage.create({
      data: {
        url: finalUrl,
        fileId,
        source,
        isLogo,
        caption: caption ?? null,
        order: count,
        experienceId,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: experienceId } = await params
  const { imageId, isLogo, caption, order } = await req.json()

  const { prisma } = await import("@workspace/database")

  try {
    if (isLogo) {
      // Unset others
      await prisma.experienceImage.updateMany({
        where: { experienceId, isLogo: true },
        data: { isLogo: false },
      })
    }

    const image = await prisma.experienceImage.update({
      where: { id: imageId },
      data: {
        isLogo: isLogo !== undefined ? isLogo : undefined,
        caption: caption !== undefined ? caption : undefined,
        order: order !== undefined ? order : undefined,
      },
    })

    return NextResponse.json(image)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { imageId } = await req.json()
  if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 })

  const { prisma } = await import("@workspace/database")

  const image = await prisma.experienceImage.findUnique({ where: { id: imageId } })
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    if (image.source === "imagekit" && image.fileId) {
      const ik = getIK()
      await ik.files.delete(image.fileId)
    }
  } catch {
    // Best-effort
  }

  await prisma.experienceImage.delete({ where: { id: imageId } })
  return NextResponse.json({ success: true })
}
