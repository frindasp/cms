"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { X, ImageIcon, Loader2, Upload, Link as LinkIcon, Star, StarOff, Grid, Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

interface PortfolioImageItem {
  id: string
  url: string
  source: string
  isLogo: boolean
  order: number
  experienceImageId?: string | null
}

interface ExperienceImage {
  id: string
  url: string
  isLogo: boolean
}

interface PortfolioImageUploaderProps {
  portfolioId?: string
  experienceId?: string | null
  images: PortfolioImageItem[]
  onImagesChange: (images: PortfolioImageItem[]) => void
}

export function PortfolioImageUploader({
  portfolioId,
  experienceId,
  images,
  onImagesChange,
}: PortfolioImageUploaderProps) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Fetch images from associated experience
  const { data: expImages = [] } = useQuery<ExperienceImage[]>({
    queryKey: ["experience-images", experienceId],
    queryFn: async () => {
      if (!experienceId) return []
      const res = await fetch(`/api/experiences/${experienceId}`)
      const data = await res.json()
      return data.images || []
    },
    enabled: !!experienceId && isPickerOpen
  })

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!portfolioId) {
         // If portfolio not yet created, just remove from local state
         return { id: imageId }
      }
      const res = await fetch(`/api/portfolios/${portfolioId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: (_data, imageId) => {
      onImagesChange(images.filter((img) => img.id !== imageId))
      if (portfolioId) queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] })
      toast.success("Image removed")
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ imageId, isLogo }: { imageId: string, isLogo: boolean }) => {
      if (!portfolioId) {
        onImagesChange(images.map(img => 
           img.id === imageId ? { ...img, isLogo } : (isLogo ? { ...img, isLogo: false } : img)
        ))
        return
      }
      const res = await fetch(`/api/portfolios/${portfolioId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, isLogo }),
      })
      if (!res.ok) throw new Error("Update failed")
      return res.json()
    },
    onSuccess: (updatedImg) => {
      if (!updatedImg) return // Handled manually for local state
      onImagesChange(images.map(img => 
        img.id === updatedImg.id ? updatedImg : (updatedImg.isLogo ? { ...img, isLogo: false } : img)
      ))
      if (portfolioId) queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] })
    }
  })

  const uploadFiles = async (files: File[]) => {
    if (!portfolioId) {
      toast.error("Please save the portfolio first before uploading images to server.")
      return
    }
    setUploading(true)
    try {
      const uploadedImages: PortfolioImageItem[] = []
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(",")[1]!)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const res = await fetch(`/api/portfolios/${portfolioId}/images`, {
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
      queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] })
      toast.success(`Uploaded ${files.length} image(s)`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return
    if (!portfolioId) {
      // Local state only if new portfolio
      const tempId = Math.random().toString(36).substr(2, 9)
      onImagesChange([...images, { 
        id: tempId, 
        url: urlInput, 
        source: "url", 
        isLogo: images.length === 0, 
        order: images.length 
      }])
      setUrlInput("")
      return
    }

    setUploading(true)
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, source: "url" }),
      })
      const img = await res.json()
      onImagesChange([...images, img])
      setUrlInput("")
      toast.success("URL added")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const pickFromExperience = async (expImg: ExperienceImage) => {
    if (!portfolioId) {
      const tempId = Math.random().toString(36).substr(2, 9)
      onImagesChange([...images, { 
        id: tempId, 
        url: expImg.url, 
        source: "imagekit", 
        isLogo: false, 
        order: images.length,
        experienceImageId: expImg.id
      }])
      setIsPickerOpen(false)
      return
    }

    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceImageId: expImg.id }),
      })
      const img = await res.json()
      onImagesChange([...images, img])
      setIsPickerOpen(false)
      toast.success("Image copied from experience")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item && item.type.indexOf("image") !== -1) {
            const file = item.getAsFile()
            if (file) files.push(file)
        }
    }
    if (files.length > 0) uploadFiles(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (files.length > 0) uploadFiles(files)
  }

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* Experience Picker Button */}
      {experienceId && (
        <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 w-full border-dashed">
              <Grid className="w-4 h-4" />
              Pick Images from Associated Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select from Experience Images</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {expImages.length === 0 ? (
                <p className="col-span-3 text-center py-8 text-muted-foreground">No images found for this experience.</p>
              ) : (
                expImages.map((img) => (
                  <div 
                    key={img.id} 
                    className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => pickFromExperience(img)}
                  >
                    <img src={img.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                      <Plus className="text-white w-6 h-6" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className={`relative group rounded-xl border aspect-square overflow-hidden ${img.isLogo ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
              <img src={img.url} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                <div className="flex gap-2">
                  <Button size="icon" variant={img.isLogo ? "default" : "secondary"} className="h-7 w-7 rounded-full" onClick={() => patchMutation.mutate({ imageId: img.id, isLogo: !img.isLogo })}>
                    {img.isLogo ? <Star className="h-3.5 h-3.5 fill-current" /> : <StarOff className="h-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full" onClick={() => deleteMutation.mutate(img.id)}>
                    <X className="h-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {img.isLogo && (
                <div className="absolute top-1.5 left-1.5 bg-primary text-[9px] font-bold px-1.5 py-0.5 rounded text-white shadow-sm">
                  LOGO
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div className="space-y-3">
        <div 
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
            ${!portfolioId ? 'opacity-50 grayscale cursor-not-allowed' : ''}
          `}
          onClick={() => portfolioId && fileRef.current?.click()}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">
            {!portfolioId ? "Save portfolio first to upload files" : "Click or drag to upload ImageKit"}
          </p>
        </div>

        <div className="flex gap-2">
          <Input 
            placeholder="Or paste URL..." 
            value={urlInput} 
            onChange={e => setUrlInput(e.target.value)}
            className="text-xs"
          />
          <Button variant="secondary" size="sm" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
            Add
          </Button>
        </div>
      </div>

      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => uploadFiles(Array.from(e.target.files || []))} />
    </div>
  )
}
