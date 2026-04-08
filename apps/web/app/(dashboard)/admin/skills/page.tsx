"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Plus, Zap } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@/components/data-table"

type Skill = {
  id: string
  name: string
  createdAt: string
  _count?: { experiences: number }
}

export default function SkillsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [editingName, setEditingName] = useState("")
  const [addError, setAddError] = useState("")
  const [editError, setEditError] = useState("")

  const { data, isLoading } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills")
      if (!res.ok) throw new Error("Failed to fetch skills")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create skill")
      }
      return res.json()
    },
    onSuccess: () => {
      setNewName("")
      setAddError("")
      setIsAddOpen(false)
      queryClient.invalidateQueries({ queryKey: ["skills"] })
    },
    onError: (err: Error) => setAddError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update skill")
      }
      return res.json()
    },
    onSuccess: () => {
      setEditingSkill(null)
      setEditingName("")
      setEditError("")
      queryClient.invalidateQueries({ queryKey: ["skills"] })
    },
    onError: (err: Error) => setEditError(err.message),
  })

  const columns: ColumnDef<Skill>[] = [
    {
      id: "actions",
      cell: ({ row }) => {
        const skill = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditingSkill(skill)
                  setEditingName(skill.name)
                  setEditError("")
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
    {
      accessorKey: "name",
      header: "Skill",
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-medium">
          <Zap className="w-3.5 h-3.5 text-primary opacity-70" />
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            Skills
          </h1>
          <p className="text-muted-foreground">
            Kelola daftar skill yang bisa dipilih di setiap experience.{" "}
            <Badge variant="secondary" className="text-xs ml-1">
              {data?.length ?? 0} skill
            </Badge>
          </p>
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open)
            if (!open) {
              setNewName("")
              setAddError("")
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Skill</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (newName.trim()) createMutation.mutate(newName.trim())
              }}
            >
              <div className="space-y-1.5">
                <Input
                  placeholder="e.g. AutoCAD"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setAddError("")
                  }}
                  autoFocus
                />
                {addError && (
                  <p className="text-xs text-destructive">{addError}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending || !newName.trim()}
                className="w-full"
              >
                {createMutation.isPending ? "Saving..." : "Create Skill"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={data || []}
        pageIndex={1}
        pageSize={data?.length || 20}
        totalCount={data?.length || 0}
        onPageChange={() => null}
        isLoading={isLoading}
      />

      {/* Edit / Rename Dialog */}
      <Dialog
        open={!!editingSkill}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSkill(null)
            setEditingName("")
            setEditError("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Skill</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (editingSkill && editingName.trim()) {
                updateMutation.mutate({ id: editingSkill.id, name: editingName.trim() })
              }
            }}
          >
            <div className="space-y-1.5">
              <Input
                value={editingName}
                onChange={(e) => {
                  setEditingName(e.target.value)
                  setEditError("")
                }}
                autoFocus
              />
              {editError && (
                <p className="text-xs text-destructive">{editError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending || !editingName.trim()}
            >
              {updateMutation.isPending ? "Saving..." : "Update Skill"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
