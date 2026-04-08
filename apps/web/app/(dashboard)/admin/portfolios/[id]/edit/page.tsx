import { prisma } from "@workspace/database"
import { notFound } from "next/navigation"
import { PortfolioForm } from "../../portfolio-form"

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      experience: { select: { id: true } },
    },
  })

  if (!portfolio) notFound()

  return (
    <PortfolioForm
      mode="edit"
      initial={{
        id: portfolio.id,
        title: portfolio.title,
        description: portfolio.description ?? "",
        images: portfolio.images as string[],
        tags: portfolio.tags as string[],
        order: portfolio.order,
        isPublished: portfolio.isPublished,
        experienceId: portfolio.experience?.id ?? "",
      }}
    />
  )
}
