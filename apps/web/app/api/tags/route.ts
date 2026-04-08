import { prisma } from "@workspace/database"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")

  const tags = await prisma.tag.findMany({
    where: q ? {
      name: { contains: q }
    } : undefined,
    take: 10,
    orderBy: { name: "asc" }
  })
  
  return NextResponse.json(tags)
}
