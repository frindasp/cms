import { prisma } from "@workspace/database"
import { notFound } from "next/navigation"
import { ExperienceForm } from "../../experience-form"

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exp = await prisma.experience.findUnique({
    where: { id },
    include: {
      skills: { orderBy: { name: "asc" } },
      images: { orderBy: { order: "asc" } },
    },
  })
  if (!exp) notFound()

  return (
    <ExperienceForm
      mode="edit"
      initial={{
        id: exp.id,
        company: exp.company,
        role: exp.role,
        type: exp.type,
        startDate: exp.startDate,
        endDate: exp.endDate ?? "",
        location: exp.location,
        skills: exp.skills.map((s) => s.name),
        description: exp.description as string[],
        images: exp.images,
        order: exp.order,
        isActive: exp.isActive,
      }}
    />
  )
}
