import { prisma } from "@workspace/database"
import { notFound } from "next/navigation"
import { ExperienceDetailClient } from "./experience-detail-client"

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: {
      skills: { orderBy: { name: "asc" } },
      images: { orderBy: { order: "asc" } },
      portfolios: { orderBy: { order: "asc" } },
    },
  })
  if (!experience) notFound()

  return <ExperienceDetailClient experience={experience as any} />
}
