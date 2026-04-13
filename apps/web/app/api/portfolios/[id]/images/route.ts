import { NextResponse } from "next/server"
import { auth } from "@/auth"
import ImageKit from "@imagekit/nodejs"
import { prisma } from "@workspace/database"

function getIK() {
  return new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: portfolioId } = await params
  const { 
    file, 
    fileName, 
    url, 
    source = "imagekit", 
    isLogo = false,
    experienceImageId 
  } = await req.json()

  try {
    let finalUrl: string | undefined = url
    let fileId: string | null = null
    let finalSource = source

    if (experienceImageId) {
      const expImg = await prisma.experienceImage.findUnique({
        where: { id: experienceImageId }
      })
      if (expImg) {
        finalUrl = expImg.url
        fileId = expImg.fileId
        finalSource = expImg.source
      }
    } else if (source === "imagekit" && file) {
      const ik = getIK()
      const result = await ik.files.upload({
        file,
        fileName,
        folder: "/portfolio",
        useUniqueFileName: true,
      })
      finalUrl = result.url
      fileId = result.fileId ?? null
    }

    if (!finalUrl) {
      return NextResponse.json({ error: "URL, file, or experienceImageId required" }, { status: 400 })
    }

    if (isLogo) {
      await prisma.portfolioImage.updateMany({
        where: { portfolioId, isLogo: true },
        data: { isLogo: false },
      })
    }

    const count = await prisma.portfolioImage.count({ where: { portfolioId } })

    const image = await prisma.portfolioImage.create({
      data: {
        url: finalUrl,
        fileId,
        source: finalSource,
        isLogo,
        order: count,
        portfolioId,
        experienceImageId: experienceImageId || null,
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

  const { id: portfolioId } = await params
  const { imageId, isLogo, order } = await req.json()

  try {
    if (isLogo) {
      await prisma.portfolioImage.updateMany({
        where: { portfolioId, isLogo: true },
        data: { isLogo: false },
      })
    }

    const image = await prisma.portfolioImage.update({
      where: { id: imageId },
      data: {
        isLogo: isLogo !== undefined ? isLogo : undefined,
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

  const image = await prisma.portfolioImage.findUnique({ where: { id: imageId } })
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    // Check if this fileId is shared. If it came from an ExperienceImage, 
    // we should probably NOT delete it from ImageKit unless we want to break the experience image.
    // However, the user said "saat didelete dia hapus dulu".
    // Let's assume they mean if it's an ImageKit source, we delete it.
    // To be safe, we could check if any other records use this fileId.
    
    if (image.source === "imagekit" && image.fileId) {
      const otherPortImgs = await prisma.portfolioImage.count({
        where: { fileId: image.fileId, id: { not: image.id } }
      })
      const expImgs = await prisma.experienceImage.count({
        where: { fileId: image.fileId }
      })

      if (otherPortImgs === 0 && expImgs === 0) {
        const ik = getIK()
        await ik.files.delete(image.fileId)
      }
    }
  } catch {
    // Best-effort
  }

  await prisma.portfolioImage.delete({ where: { id: imageId } })
  return NextResponse.json({ success: true })
}
