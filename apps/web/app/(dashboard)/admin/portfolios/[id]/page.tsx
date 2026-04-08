import Link from "next/link"
import { prisma } from "@workspace/database"
import { notFound } from "next/navigation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ArrowLeft, Pencil } from "lucide-react"

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      experience: {
        select: {
          id: true,
          company: true,
          role: true,
        },
      },
    },
  })

  if (!portfolio) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/portfolios">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{portfolio.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detail portfolio item.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href={`/admin/portfolios/${portfolio.id}/edit`}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={portfolio.isPublished ? "default" : "secondary"}>
              {portfolio.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          <p>
            <span className="text-muted-foreground">Urutan:</span> {portfolio.order}
          </p>
          {portfolio.description && (
            <p>
              <span className="text-muted-foreground">Deskripsi:</span> {portfolio.description}
            </p>
          )}
          {portfolio.experience && (
            <p>
              <span className="text-muted-foreground">Experience:</span>{" "}
              <Link className="underline" href={`/admin/experiences/${portfolio.experience.id}`}>
                {portfolio.experience.company} — {portfolio.experience.role}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(portfolio.tags as string[]).length > 0 ? (
              (portfolio.tags as string[]).map((tag, i) => (
                <Badge key={`${tag}-${i}`} variant="secondary">{tag}</Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada tag.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent>
          {(portfolio.images as string[]).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(portfolio.images as string[]).map((img, i) => (
                <a
                  key={`${img}-${i}`}
                  href={img}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border p-3 text-xs text-primary underline truncate"
                >
                  {img}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada image URL.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
