import { NextResponse } from "next/server"
import { auth } from "@/auth"
import ImageKit from "@imagekit/nodejs"

/**
 * POST /api/experiences/[id]/images
 * Upload one image to ImageKit under folder "experience",
 * save it to ExperienceImage table.
 *
 * DELETE /api/experiences/[id]/images
 * Delete an ExperienceImage by its id and remove from ImageKit.
 */

// Lazy-init ImageKit client
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
  const { file, fileName, caption } = await req.json()

  if (!file || !fileName) {
    return NextResponse.json({ error: "file and fileName required" }, { status: 400 })
  }

  // Dynamic import to avoid build-time issues
  const { prisma } = await import("@workspace/database")

  try {
    const ik = getIK()
    const result = await ik.files.upload({
      file,
      fileName,
      folder: "/experience",
      useUniqueFileName: true,
    })

    // Count existing images for order
    const count = await prisma.experienceImage.count({ where: { experienceId } })

    const image = await prisma.experienceImage.create({
      data: {
        url: result.url ?? "",
        fileId: result.fileId ?? "",
        caption: caption ?? null,
        order: count,
        experienceId,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 })
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
    // Delete from ImageKit first
    const ik = getIK()
    await ik.files.delete(image.fileId)
  } catch {
    // Best-effort: continue even if ImageKit deletion fails (file may not exist)
  }

  await prisma.experienceImage.delete({ where: { id: imageId } })
  return NextResponse.json({ success: true })
}
