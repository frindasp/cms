"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Plus, Save, X, ImageIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Badge } from "@workspace/ui/components/badge"

import { TagInput } from "@/components/tag-input"
import { PortfolioImageUploader } from "@/components/portfolio-image-uploader"

interface ExperienceOption {
  id: string
  company: string
  role: string
}

interface PortfolioImageItem {
  id: string
  url: string
  source: string
  isLogo: boolean
  order: number
}

interface TagItem {
  id: string
  name: string
}

interface PortfolioFormData {
  id?: string
  title: string
  description: string
  images: PortfolioImageItem[]
  tags: string[]
  order: number
  isPublished: boolean
  experienceId: string
}

interface PortfolioFormProps {
  mode: "new" | "edit"
  initial?: any
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
    id: initial?.id,
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    images: initial?.images ?? [],
    tags: initial?.tags?.map((t: any) => t.name) ?? [],
    experienceId: initial?.experienceId ?? "",
    order: initial?.order ?? 0,
    isPublished: initial?.isPublished ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", "portfolio-options"],
    queryFn: fetchExperiences,
  })

  const set = <K extends keyof PortfolioFormData>(key: K, value: PortfolioFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-20">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Informasi Utama</CardTitle>
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
                  className="text-lg font-medium h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Tulis deskripsi singkat project..."
                  rows={8}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Portfolio Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PortfolioImageUploader
                portfolioId={form.id}
                experienceId={form.experienceId}
                images={form.images}
                onImagesChange={(imgs) => set("images", imgs)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Settings & Relations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="experienceId">Relasi Experience</Label>
                <select
                  id="experienceId"
                  value={form.experienceId}
                  onChange={(e) => set("experienceId", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Tanpa Experience</option>
                  {experiences.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.company} — {exp.role}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">Menghubungkan ke experience memungkinkan Anda memilih gambar dari riwayat kerja tersebut.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Urutan Tampil</Label>
                <Input
                  id="order"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => set("order", parseInt(e.target.value) || 0)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublished" className="text-sm font-medium">Published</Label>
                  <p className="text-[10px] text-muted-foreground">Tampilkan di website publik.</p>
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
              <CardTitle className="text-base font-semibold">Tags / Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput
                value={form.tags}
                onChange={(tags) => set("tags", tags)}
                placeholder="Tambah kategori (e.g. Interior, Concept...)"
              />
            </CardContent>
          </Card>

          <div className="sticky top-6">
            <Button type="submit" disabled={saving} className="w-full h-12 text-base font-semibold shadow-xl">
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
