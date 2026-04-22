"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft,
  Save,
  Play,
  Code,
  Trash,
  Table as TableIcon,
  ChevronRight,
  Database
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Editor, { useMonaco } from "@monaco-editor/react"
import { API_ROUTES } from "@/lib/constants"
import Link from "next/link"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { toast } from "sonner"
import { Badge } from "@workspace/ui/components/badge"

export default function SchemaBackupQueryEditPage() {
  const params = useParams()
  const id = params.id as string
  const schemaName = params.schemaName as string
  const editorId = params.editorId as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const editorRef = useRef<any>(null)
  
  const autoRunTriggered = useRef(false)
  const shouldAutoRun = searchParams.get("run") === "true"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sql, setSql] = useState("")
  const [results, setResults] = useState<any[] | null>(null)

  const monaco = useMonaco()

  const { data: queryData, isLoading } = useQuery({
    queryKey: ["backup-query", editorId],
    queryFn: async () => {
      const res = await fetch(`/api/backup/query/${editorId}`)
      const json = await res.json()
      return json.data
    },
  })

  const { data: tables } = useQuery({
    queryKey: ["backup-tables", id, schemaName],
    queryFn: async () => {
      const url = `${API_ROUTES.BACKUP}/${id}/tables?name=${schemaName}`
      const res = await fetch(url)
      const json = await res.json()
      return json.data || []
    },
  })

  useEffect(() => {
    if (queryData) {
      setName(queryData.name)
      setDescription(queryData.description || "")
      setSql(queryData.sql)
    }
  }, [queryData])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backup/query/${editorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sql, schemaName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update script")
      return data.data
    },
    onSuccess: () => {
      toast.success("Script updated successfully")
      queryClient.invalidateQueries({ queryKey: ["backup-query", editorId] })
    },
    onError: (error: any) => {
      toast.error("Error updating script", { description: error.message })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async () => {
      setResults(null)
      let sqlToRun = sql
      if (editorRef.current) {
        const editor = editorRef.current
        const selection = editor.getSelection()
        const model = editor.getModel()
        if (selection && !selection.isEmpty()) {
          sqlToRun = model.getValueInRange(selection)
        } else {
          const position = editor.getPosition()
          const text = model.getValue()
          const statements = text.split(";")
          let currentPos = 0
          const cursorIndex = model.getOffsetAt(position)
          for (let s of statements) {
            const start = currentPos
            const end = currentPos + s.length
            if (cursorIndex >= start && cursorIndex <= end + 1) {
              sqlToRun = s.trim()
              break
            }
            currentPos = end + 1
          }
        }
      }

      const res = await fetch(`/api/backup/${id}/queries/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to execute")
      return data.data
    },
    onSuccess: (data) => {
      setResults(data)
      toast.success("Query executed successfully")
    },
    onError: (error: any) => {
      toast.error("Execution failed", { description: error.message })
    },
  })

  useEffect(() => {
    if (shouldAutoRun && !isLoading && queryData && !autoRunTriggered.current) {
      autoRunTriggered.current = true
      setTimeout(() => executeMutation.mutate(), 1000)
    }
  }, [shouldAutoRun, isLoading, queryData, executeMutation])

  if (isLoading) return <div className="p-8">Loading script...</div>
  if (!queryData) return <div className="p-8">Script not found</div>

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/admin/backup/${id}/schemas/${schemaName}/tables/editor`} className="hover:text-primary transition-colors">SQL Scripts</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{queryData.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight truncate max-w-[400px]">{queryData.name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                 <Badge variant="outline">{schemaName}</Badge>
                 <span>for {queryData.backupConfig.databaseName}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
          <Button size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
            <Play className="mr-2 h-4 w-4" />
            Run Query
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 flex-1 px-8 pb-8 overflow-hidden">
        <div className="md:col-span-3 space-y-4 overflow-auto pr-2 custom-scrollbar">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Script Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Schema Context</Label>
                <Input value={schemaName} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
              </div>
            </CardContent>
          </Card>
          
          {tables && (
            <Card className="flex-1 min-h-0 flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><TableIcon className="h-4 w-4" />Tables</CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-border">
                  {tables.map((table: any) => (
                    <button key={table.name} onClick={() => setSql(prev => prev + `\n\nSELECT * FROM ${table.name} LIMIT 10;`)} className="w-full text-left px-4 py-2 text-xs hover:bg-muted/50 truncate font-mono text-muted-foreground">{table.name}</button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-9 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 overflow-hidden">
            <CardContent className="h-full p-0">
              <Editor height="100%" defaultLanguage="sql" theme="vs-dark" value={sql} onChange={(v) => setSql(v || "")} onMount={(e) => { editorRef.current = e; }} />
            </CardContent>
          </Card>
          <Card className="h-1/3 flex flex-col overflow-hidden">
             <CardHeader className="py-2 border-b"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
             <CardContent className="flex-1 p-0 overflow-auto">
                {results ? (
                   <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                         <tr>{Object.keys(results[0] || {}).map(k => <th key={k} className="px-2 py-1 text-left border-b border-r">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                         {results.map((r, i) => <tr key={i}>{Object.values(r).map((v:any, j) => <td key={j} className="px-2 py-1 border-b border-r truncate max-w-[200px]">{String(v)}</td>)}</tr>)}
                      </tbody>
                   </table>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground text-xs">Run query to see results</div>}
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
