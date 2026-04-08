"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X, ImageIcon, Loader2, Upload, Link as LinkIcon, Star, StarOff } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"

interface ExperienceImageItem {
  id: string
  url: string
  fileId?: string | null
  source: string
  isLogo: boolean
  caption?: string | null
  order: number
}

interface ExperienceImageUploaderProps {
  experienceId: string
  images: ExperienceImageItem[]
  onImagesChange: (images: ExperienceImageItem[]) => void
}

export function ExperienceImageUploader({
  experienceId,
  images,
  onImagesChange,
}: ExperienceImageUploaderProps) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(`/api/experiences/${experienceId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: (_data, imageId) => {
      onImagesChange(images.filter((img) => img.id !== imageId))
      queryClient.invalidateQueries({ queryKey: ["experience", experienceId] })
      toast.success("Image deleted")
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ imageId, isLogo }: { imageId: string, isLogo: boolean }) => {
      const res = await fetch(`/api/experiences/${experienceId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, isLogo }),
      })
      if (!res.ok) throw new Error("Update failed")
      return res.json()
    },
    onSuccess: (updatedImg) => {
      onImagesChange(images.map(img => 
        img.id === updatedImg.id ? updatedImg : (updatedImg.isLogo ? { ...img, isLogo: false } : img)
      ))
      queryClient.invalidateQueries({ queryKey: ["experience", experienceId] })
      toast.success(updatedImg.isLogo ? "Set as logo" : "Removed as logo")
    }
  })

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    try {
      const uploadedImages: ExperienceImageItem[] = []
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(",")[1]!)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const res = await fetch(`/api/experiences/${experienceId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            file: base64, 
            fileName: file.name,
            source: "imagekit"
          }),
        })

        if (!res.ok) throw new Error("Upload failed")
        const img = await res.json()
        uploadedImages.push(img)
      }
      onImagesChange([...images, ...uploadedImages])
      queryClient.invalidateQueries({ queryKey: ["experience", experienceId] })
      toast.success(`Successfully uploaded ${files.length} image(s)`)
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return
    setUploading(true)
    try {
      const res = await fetch(`/api/experiences/${experienceId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: urlInput, 
          source: "url"
        }),
      })
      if (!res.ok) throw new Error("Failed to save URL")
      const img = await res.json()
      onImagesChange([...images, img])
      setUrlInput("")
      toast.success("Image URL saved")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item && item.type?.indexOf("image") !== -1) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className={`relative group rounded-xl overflow-hidden border aspect-square transition-all ${img.isLogo ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
              <img
                src={img.url}
                alt={img.caption ?? "Experience image"}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant={img.isLogo ? "default" : "secondary"}
                    className="h-8 w-8 rounded-full"
                    onClick={() => patchMutation.mutate({ imageId: img.id, isLogo: !img.isLogo })}
                    title={img.isLogo ? "Remove Logo" : "Set as Logo"}
                  >
                    {img.isLogo ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full"
                    onClick={() => deleteMutation.mutate(img.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete image"
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </div>
                <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full uppercase font-medium">
                  {img.source}
                </span>
              </div>
              {img.isLogo && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> LOGO
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:bg-muted/50'}
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Processing images...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Click to upload or drag & drop</p>
                <p className="text-xs mt-1">PNG, JPG, WEBP · Supports copy-paste from clipboard</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Or paste image URL here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="pl-9"
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || uploading}
          >
            Add URL
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) uploadFiles(files)
        }}
      />

      <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
        💡 <strong>Pro tip:</strong> You can copy an image from your computer and paste it (Ctrl+V) directly on this page to upload it instantly. The "isLogo" image will be prioritized for display.
      </p>
    </div>
  )
}
