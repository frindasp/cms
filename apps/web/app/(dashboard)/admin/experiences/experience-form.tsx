"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { computePeriodLabel } from "@/lib/period-label"
import { SkillCombobox } from "@/components/skill-combobox"
import { ExperienceImageUploader } from "@/components/experience-image-uploader"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import { Badge } from "@workspace/ui/components/badge"
import {
  Loader2, Save, Plus, Trash2, ArrowLeft, ImageIcon,
} from "lucide-react"
import Link from "next/link"

interface ExperienceImage {
  id: string
  url: string
  fileId: string
  caption?: string | null
  order: number
}

interface ExperienceFormData {
  id?: string
  company: string
  role: string
  type: string
  startDate: string
  endDate: string
  location: string
  skills: string[]
  description: string[]
  images: ExperienceImage[]
  order: number
  isActive: boolean
}

interface ExperienceFormProps {
  initial?: Partial<ExperienceFormData>
  mode: "new" | "edit"
}

const emptyForm: ExperienceFormData = {
  company: "",
  role: "",
  type: "Purnawaktu",
  startDate: "",
  endDate: "",
  location: "",
  skills: [],
  description: [],
  images: [],
  order: 0,
  isActive: true,
}

export function ExperienceForm({ initial, mode }: ExperienceFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ExperienceFormData>({
    ...emptyForm,
    ...initial,
  })
  const [descInput, setDescInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ExperienceFormData>(key: K, value: ExperienceFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addDesc = () => {
    const d = descInput.trim()
    if (d) set("description", [...form.description, d])
    setDescInput("")
  }

  const removeDesc = (i: number) => {
    set("description", form.description.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url = mode === "new" ? "/api/experiences" : `/api/experiences/${form.id}`
      const method = mode === "new" ? "POST" : "PUT"

      // Send skills as names; images are managed separately via the uploader
      const { images: _images, ...payload } = form

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")

      const saved = await res.json()
      queryClient.invalidateQueries({ queryKey: ["skills"] })
      queryClient.invalidateQueries({ queryKey: ["experiences"] })

      // After creating a new experience, go to its detail/edit page so user can upload images
      if (mode === "new") {
        router.push(`/admin/experiences/${saved.id}`)
      } else {
        router.push("/admin/experiences")
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const employmentTypes = ["Purnawaktu", "Paruh Waktu", "Kontrak", "Magang", "Pekerja Lepas", "Sementara"]

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/experiences">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "new" ? "Add Experience" : "Edit Experience"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {mode === "new"
              ? "Create a new work experience entry. You can add images after saving."
              : "Update this experience entry."}
          </p>
        </div>
      </div>

      <Separator />

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role / Position *</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Interior Designer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Company Name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Employment Type</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {employmentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={form.order}
                onChange={(e) => set("order", parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Jakarta, Indonesia · Di lokasi"
            />
          </div>
        </CardContent>
      </Card>

      {/* Period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="month"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (leave empty if current)</Label>
              <Input
                id="endDate"
                type="month"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>
          {form.startDate && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Preview: </span>
              {computePeriodLabel(form.startDate, form.endDate || null)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images — only available in edit mode */}
      {mode === "edit" && form.id ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Images
              <Badge variant="secondary" className="text-xs">{form.images.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExperienceImageUploader
              experienceId={form.id}
              images={form.images}
              onImagesChange={(imgs) => set("images", imgs)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-5 pb-5 flex items-center gap-3 text-muted-foreground">
            <ImageIcon className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Images can be uploaded after saving this experience.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillCombobox
            value={form.skills}
            onChange={(names) => set("skills", names)}
          />
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description Bullets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Add a bullet point description..."
              rows={3}
            />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addDesc}>
              <Plus className="w-3.5 h-3.5" />
              Add Bullet
            </Button>
          </div>
          {form.description.length > 0 && (
            <ul className="space-y-2">
              {form.description.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span className="flex-1">{d}</span>
                  <button
                    type="button"
                    onClick={() => removeDesc(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Active / Visible</p>
            <p className="text-xs text-muted-foreground">When off, this entry is hidden from the portfolio.</p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={(v: boolean) => set("isActive", v)}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : mode === "new" ? "Create Experience" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/experiences">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
