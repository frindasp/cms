"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Plus, Save, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Badge } from "@workspace/ui/components/badge"

interface ExperienceOption {
  id: string
  company: string
  role: string
}

interface PortfolioFormData {
  id?: string
  title: string
  description: string
  images: string[]
  tags: string[]
  order: number
  isPublished: boolean
  experienceId: string
}

interface PortfolioFormProps {
  mode: "new" | "edit"
  initial?: Partial<PortfolioFormData>
}

const emptyForm: PortfolioFormData = {
  title: "",
  description: "",
  images: [],
  tags: [],
  order: 0,
  isPublished: true,
  experienceId: "",
}

async function fetchExperiences(): Promise<ExperienceOption[]> {
  const res = await fetch("/api/experiences")
  if (!res.ok) throw new Error("Failed to load experiences")
  const data = (await res.json()) as Array<{ id: string; company: string; role: string }>
  return data.map((item) => ({
    id: item.id,
    company: item.company,
    role: item.role,
  }))
}

export function PortfolioForm({ mode, initial }: PortfolioFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PortfolioFormData>({
    ...emptyForm,
    ...initial,
    description: initial?.description ?? "",
    images: initial?.images ?? [],
    tags: initial?.tags ?? [],
    experienceId: initial?.experienceId ?? "",
  })
  const [imageInput, setImageInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", "portfolio-options"],
    queryFn: fetchExperiences,
  })

  const set = <K extends keyof PortfolioFormData>(key: K, value: PortfolioFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addImage = () => {
    const value = imageInput.trim()
    if (!value) return
    set("images", [...form.images, value])
    setImageInput("")
  }

  const removeImage = (idx: number) => {
    set("images", form.images.filter((_, i) => i !== idx))
  }

  const addTag = () => {
    const value = tagInput.trim()
    if (!value) return
    set("tags", [...form.tags, value])
    setTagInput("")
  }

  const removeTag = (idx: number) => {
    set("tags", form.tags.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = mode === "new" ? "/api/portfolios" : `/api/portfolios/${form.id}`
      const method = mode === "new" ? "POST" : "PUT"

      const payload = {
        title: form.title,
        description: form.description || null,
        images: form.images,
        tags: form.tags,
        order: form.order,
        isPublished: form.isPublished,
        experienceId: form.experienceId || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Gagal menyimpan portfolio")
      }

      const saved = await res.json()
      queryClient.invalidateQueries({ queryKey: ["portfolios"] })

      if (mode === "new") {
        router.push(`/admin/portfolios/${saved.id}`)
      } else {
        router.push("/admin/portfolios")
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan"
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/portfolios">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "new" ? "Tambah Portfolio" : "Edit Portfolio"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {mode === "new" ? "Buat item portfolio baru." : "Perbarui data portfolio."}
          </p>
        </div>
      </div>

      <Separator />

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Judul *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Interior Renovation Project"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tulis deskripsi singkat project..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceId">Relasi Experience</Label>
              <select
                id="experienceId"
                value={form.experienceId}
                onChange={(e) => set("experienceId", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Tanpa Experience</option>
                {experiences.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.company} — {exp.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Urutan</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => set("order", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="isPublished" className="text-sm font-medium">Published</Label>
              <p className="text-xs text-muted-foreground">Jika nonaktif maka item menjadi draft.</p>
            </div>
            <Switch
              id="isPublished"
              checked={form.isPublished}
              onCheckedChange={(v) => set("isPublished", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="https://..."
            />
            <Button type="button" variant="outline" onClick={addImage}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {form.images.length > 0 && (
            <div className="space-y-2">
              {form.images.map((img, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <p className="text-xs truncate flex-1">{img}</p>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="interior"
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag, i) => (
                <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Simpan
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
