import { prisma } from "@workspace/database";
import { notFound } from "next/navigation";
import { ExperienceForm } from "../../experience-form";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exp = await prisma.experience.findUnique({ where: { id } });
  if (!exp) notFound();

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
        periodLabel: exp.periodLabel,
        location: exp.location,
        skills: exp.skills as string[],
        description: exp.description as string[],
        imageUrl: exp.imageUrl ?? "",
        imageFileId: exp.imageFileId ?? "",
        order: exp.order,
        isActive: exp.isActive,
      }}
    />
  );
}
