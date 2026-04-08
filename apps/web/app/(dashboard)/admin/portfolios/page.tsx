"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  FolderOpen,
  Loader2,
  Trash2,
  ExternalLink,
  Briefcase,
  Plus,
  Pencil,
} from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"

interface Portfolio {
  id: string
  title: string
  description?: string | null
  images: string[]
  tags: string[]
  order: number
  isPublished: boolean
  experience?: {
    id: string
    company: string
    role: string
  } | null
}

async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios")
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function PortfoliosAdminPage() {
  const queryClient = useQueryClient()

  const { data: portfolios = [], isLoading } = useQuery<Portfolio[]>({
    queryKey: ["portfolios"],
    queryFn: fetchPortfolios,
  })

  const { mutate: deletePortfolio, variables: deletingId } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/portfolios/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolios"] }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" />
            Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            Semua item portfolio yang ditampilkan di halaman portfolio. {" "}
            <Badge variant="secondary" className="text-xs">{portfolios.length} item</Badge>
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/portfolios/new">
            <Plus className="w-4 h-4 mr-1" />
            Tambah Portfolio
          </Link>
        </Button>
      </div>

      <Separator />

      {portfolios.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Belum ada portfolio item.</p>
          <p className="text-xs mt-1">
            Klik tombol <strong>Tambah Portfolio</strong> untuk membuat item baru.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolios.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={item.isPublished ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {item.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {item.experience && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Briefcase className="w-3 h-3" />
                        <Link
                          href={`/admin/experiences/${item.experience.id}`}
                          className="hover:text-foreground transition-colors hover:underline"
                        >
                          {item.experience.company} — {item.experience.role}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/admin/portfolios/${item.id}/edit`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/admin/portfolios/${item.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Portfolio Item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Hapus <strong>{item.title}</strong> dari portfolio? Tidak bisa dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePortfolio(item.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
