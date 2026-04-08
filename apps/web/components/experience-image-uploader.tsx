"use client"

import { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X, ImageIcon, Loader2, Upload } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

interface ExperienceImageItem {
  id: string
  url: string
  fileId: string
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
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    },
  })

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setUploadError(null)

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
          body: JSON.stringify({ file: base64, fileName: file.name }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Upload failed")
        }

        const img = await res.json()
        uploadedImages.push(img)
      }

      onImagesChange([...images, ...uploadedImages])
      queryClient.invalidateQueries({ queryKey: ["experience", experienceId] })
    } catch (err: any) {
      setUploadError(err.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
              <img
                src={img.url}
                alt={img.caption ?? "Experience image"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(img.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/90 transition-colors"
                  title="Delete image"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => !uploading && fileRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
            <p className="text-sm">
              Click to upload images<br />
              <span className="text-xs">PNG, JPG, WEBP · Multiple files supported</span>
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />

      {!uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Images
        </Button>
      )}

      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Images are stored on ImageKit under <code className="bg-muted px-1 rounded">/experience</code> folder. First image is used as cover.
      </p>
    </div>
  )
}
