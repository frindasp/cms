"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { computePeriodLabel } from "@/lib/period-label"
import { SkillCombobox } from "@/components/skill-combobox"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import {
  Loader2,
  Save,
  X,
  Plus,
  ImageIcon,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

interface ExperienceFormData {
  id?: string
  company: string
  role: string
  type: string
  startDate: string
  endDate: string
  location: string
  /** Skill names (not IDs) — API handles upsert */
  skills: string[]
  description: string[]
  imageUrl: string
  imageFileId: string
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
  imageUrl: "",
  imageFileId: "",
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
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string>(initial?.imageUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  // Upload image via API
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",")[1]!)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, fileName: file.name, folder: "/portfolio/experiences" }),
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      set("imageUrl", data.url)
      set("imageFileId", data.fileId)
      setUploadPreview(data.url)
    } catch (err: any) {
      setError(err.message || "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    set("imageUrl", "")
    set("imageFileId", "")
    setUploadPreview("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url = mode === "new" ? "/api/experiences" : `/api/experiences/${form.id}`
      const method = mode === "new" ? "POST" : "PUT"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Save failed")
      // Invalidate skills cache so new skills show up immediately in other forms
      queryClient.invalidateQueries({ queryKey: ["skills"] })
      router.push("/admin/experiences")
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
            {mode === "new" ? "Create a new work experience entry." : "Update this experience entry."}
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

      {/* Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company / Project Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadPreview ? (
            <div className="relative inline-block">
              <img
                src={uploadPreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={removeImage}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB · Stored on ImageKit</p>
                </>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {!uploadPreview && !uploading && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="w-3.5 h-3.5" />
              Upload Image
            </Button>
          )}
        </CardContent>
      </Card>

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
