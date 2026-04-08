"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { computePeriodLabel } from "@/lib/period-label"
import { ExperienceImageUploader } from "@/components/experience-image-uploader"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
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
  ArrowLeft,
  Pencil,
  Calendar,
  MapPin,
  Briefcase,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  ImageIcon,
  FolderOpen,
} from "lucide-react"

interface Skill { id: string; name: string }
interface ExperienceImage { id: string; url: string; fileId: string; caption?: string | null; order: number }
interface Portfolio {
  id: string
  title: string
  description?: string | null
  images: string[]
  tags: string[]
  order: number
  isPublished: boolean
}

interface Experience {
  id: string
  company: string
  role: string
  type: string
  startDate: string
  endDate?: string | null
  location: string
  skills: Skill[]
  description: string[]
  images: ExperienceImage[]
  portfolios: Portfolio[]
  order: number
  isActive: boolean
}

interface ExperienceDetailClientProps {
  experience: Experience
}

const emptyPortfolio = { title: "", description: "" }

export function ExperienceDetailClient({ experience: initial }: ExperienceDetailClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [exp, setExp] = useState(initial)
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolio)
  const [portfolioError, setPortfolioError] = useState("")

  const createPortfolioMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: portfolioForm.title.trim(),
          description: portfolioForm.description.trim() || null,
          experienceId: exp.id,
          order: exp.portfolios.length,
        }),
      })
      if (!res.ok) throw new Error("Failed to create portfolio")
      return res.json()
    },
    onSuccess: (portfolio) => {
      setExp((prev) => ({ ...prev, portfolios: [...prev.portfolios, portfolio] }))
      setPortfolioForm(emptyPortfolio)
      setPortfolioError("")
      setIsAddPortfolioOpen(false)
    },
    onError: (err: Error) => setPortfolioError(err.message),
  })

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolios/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      return id
    },
    onSuccess: (id) => {
      setExp((prev) => ({ ...prev, portfolios: prev.portfolios.filter((p) => p.id !== id) }))
    },
  })

  const periodLabel = computePeriodLabel(exp.startDate, exp.endDate)
  const coverImage = exp.images[0]

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/experiences">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{exp.role}</h1>
          <p className="text-muted-foreground text-sm">{exp.company}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={exp.isActive ? "default" : "secondary"}>
            {exp.isActive ? "Active" : "Hidden"}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/experiences/${exp.id}/edit`}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{exp.type}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{periodLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{exp.location}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cover image preview */}
        <Card>
          <CardContent className="pt-5">
            {coverImage ? (
              <img
                src={coverImage.url}
                alt={exp.company}
                className="w-full h-28 object-cover rounded-md border border-border"
              />
            ) : (
              <div className="w-full h-28 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {exp.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {exp.skills.map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {exp.description.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {exp.description.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images
            <Badge variant="secondary" className="text-xs">{exp.images.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExperienceImageUploader
            experienceId={exp.id}
            images={exp.images}
            onImagesChange={(imgs) => setExp((prev) => ({ ...prev, images: imgs }))}
          />
        </CardContent>
      </Card>

      {/* Portfolio Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Portfolio Items
              <Badge variant="secondary" className="text-xs">{exp.portfolios.length}</Badge>
            </CardTitle>
            <Dialog open={isAddPortfolioOpen} onOpenChange={(open) => {
              setIsAddPortfolioOpen(open)
              if (!open) { setPortfolioForm(emptyPortfolio); setPortfolioError("") }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Portfolio Item</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (portfolioForm.title.trim()) createPortfolioMutation.mutate()
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="ptitle">Title *</Label>
                    <Input
                      id="ptitle"
                      placeholder="e.g. Residential House Renovation"
                      value={portfolioForm.title}
                      onChange={(e) => setPortfolioForm((p) => ({ ...p, title: e.target.value }))}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdesc">Description</Label>
                    <Textarea
                      id="pdesc"
                      placeholder="Brief description of this project…"
                      rows={3}
                      value={portfolioForm.description}
                      onChange={(e) => setPortfolioForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  {portfolioError && (
                    <p className="text-xs text-destructive">{portfolioError}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createPortfolioMutation.isPending || !portfolioForm.title.trim()}
                  >
                    {createPortfolioMutation.isPending ? "Creating…" : "Create Portfolio Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {exp.portfolios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No portfolio items yet for this experience.</p>
              <p className="text-xs mt-1">Add projects/work done at {exp.company}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exp.portfolios.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link href={`/admin/portfolios/${p.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Portfolio Item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete <strong>{p.title}</strong>? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePortfolioMutation.mutate(p.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
