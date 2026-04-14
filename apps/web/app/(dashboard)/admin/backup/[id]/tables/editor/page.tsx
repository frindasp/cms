"use client"

import { useParams, useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Code,
  Play,
  Calendar,
  Clock,
  ChevronLeft,
  Trash2,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"

export default function BackupQueriesListPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")

  const { data: config } = useQuery({
    queryKey: ["backup-config", id],
    queryFn: async () => {
      const res = await fetch(`/api/backup/${id}`)
      const json = await res.json()
      return json.data
    },
  })

  const { data: queries, isLoading } = useQuery({
    queryKey: ["backup-queries", id],
    queryFn: async () => {
      const res = await fetch(`/api/backup/${id}/queries`)
      const json = await res.json()
      return json.data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const res = await fetch(`/api/backup/query/${queryId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete script")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Script deleted")
      queryClient.invalidateQueries({ queryKey: ["backup-queries", id] })
    },
    onError: (error: any) => {
      toast.error("Error deleting script", { description: error.message })
    },
  })

  const filteredQueries = (queries || []).filter(
    (q: any) =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) return <div className="p-8">Loading scripts...</div>

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/backup/${id}/tables`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">SQL Scripts</h2>
            <p className="text-sm text-muted-foreground">
              Manage your saved queries for {config?.databaseName}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/backup/${id}/tables/editor/create`}>
            <Plus className="mr-2 h-4 w-4" />
            New SQL Script
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredQueries.length} scripts found
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Script Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[180px]">Last Updated</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueries.length > 0 ? (
                filteredQueries.map((q: any) => (
                  <TableRow
                    key={q.id}
                    className="group cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/backup/${id}/tables/editor/${q.id}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                          <Code className="h-4 w-4" />
                        </div>
                        {q.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px] truncate text-muted-foreground">
                      {q.description || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      <div className="flex flex-col text-[11px]">
                        <span>
                          {new Date(q.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="opacity-50">
                          {new Date(q.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          asChild
                          title="Run Query"
                        >
                          <Link
                            href={`/admin/backup/${id}/tables/editor/${q.id}?run=true`}
                          >
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                          title="Delete Script"
                          onClick={() => {
                            if (confirm("Delete this script?"))
                              deleteMutation.mutate(q.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Code className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No scripts found matching your search.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        Clear Search
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
