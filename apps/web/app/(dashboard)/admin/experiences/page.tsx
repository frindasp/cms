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
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  MapPin,
  GripVertical,
} from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"
import { computePeriodLabel } from "@/lib/period-label"

interface Skill {
  id: string
  name: string
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
  imageUrl?: string
  order: number
  isActive: boolean
}

async function fetchExperiences(): Promise<Experience[]> {
  const res = await fetch("/api/experiences")
  if (!res.ok) throw new Error("Failed to fetch experiences")
  return res.json()
}

export default function ExperiencesAdminPage() {
  const queryClient = useQueryClient()

  const { data: experiences = [], isLoading } = useQuery<Experience[]>({
    queryKey: ["experiences"],
    queryFn: fetchExperiences,
  })

  const { mutate: deleteExperience, variables: deletingId } = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/experiences/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiences"] })
    },
  })

  const { mutate: toggleActive } = useMutation({
    mutationFn: (exp: Experience) =>
      fetch(`/api/experiences/${exp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !exp.isActive }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiences"] })
    },
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
          <h1 className="text-3xl font-bold tracking-tight">Experiences</h1>
          <p className="text-muted-foreground mt-1">
            Manage work experience entries shown on the portfolio.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/experiences/new">
            <Plus className="w-4 h-4" />
            Add Experience
          </Link>
        </Button>
      </div>

      <Separator />

      {experiences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No experiences yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <Card
              key={exp.id}
              className={`transition-opacity ${!exp.isActive ? "opacity-50" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 cursor-grab" />

                  {exp.imageUrl && (
                    <img
                      src={exp.imageUrl}
                      alt={exp.company}
                      className="w-12 h-12 rounded object-cover border border-border shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm leading-snug">{exp.role}</p>
                        <p className="text-sm text-muted-foreground">
                          {exp.company}
                          <span className="mx-1.5">·</span>
                          <span>{exp.type}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={exp.isActive ? "default" : "secondary"}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleActive(exp)}
                        >
                          {exp.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {computePeriodLabel(exp.startDate, exp.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {exp.location}
                      </span>
                    </div>

                    {exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.skills.slice(0, 5).map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                          >
                            {s.name}
                          </span>
                        ))}
                        {exp.skills.length > 5 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{exp.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/admin/experiences/${exp.id}/edit`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deletingId === exp.id}
                        >
                          {deletingId === exp.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Experience?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete{" "}
                            <strong>{exp.role}</strong> at <strong>{exp.company}</strong>.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteExperience(exp.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
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
