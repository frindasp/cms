import Link from "next/link"
import { prisma } from "@workspace/database"
import { notFound } from "next/navigation"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ArrowLeft, Pencil } from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"

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
      images: { orderBy: { order: "asc" } },
      tags: true,
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
          <CardTitle className="text-base font-semibold">Informasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={portfolio.isPublished ? "default" : "secondary"}>
                {portfolio.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Urutan:</span>
              <Badge variant="outline">{portfolio.order}</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <span className="text-muted-foreground font-medium">Deskripsi:</span>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/80">
              {portfolio.description || <span className="italic text-muted-foreground/50">Tidak ada deskripsi.</span>}
            </p>
          </div>

          {portfolio.experience && (
            <div className="rounded-lg bg-muted/30 p-3 border">
              <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Experience</span>
              <div className="mt-1">
                <Link className="font-medium hover:underline text-primary" href={`/admin/experiences/${portfolio.experience.id}`}>
                  {portfolio.experience.company} — {portfolio.experience.role}
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {portfolio.tags.length > 0 ? (
              portfolio.tags.map((tag: { id: string; name: string }) => (
                <Badge key={tag.id} variant="secondary" className="px-3 py-1 font-medium">{tag.name}</Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">Belum ada tag.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Project Images</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.images.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.images.map((img: { id: string; url: string; isLogo: boolean }) => (
                <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border bg-muted">
                  <img
                    src={img.url}
                    alt={portfolio.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {img.isLogo && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                      LOGO
                    </div>
                  )}
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity truncate"
                  >
                    {img.url}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-xl">Belum ada image.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
