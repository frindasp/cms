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
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Editor, { useMonaco } from "@monaco-editor/react"
import { API_ROUTES } from "@/lib/constants"

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

export default function BackupQueryEditPage() {
  const params = useParams()
  const id = params.id as string
  const editorId = params.editorId as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const schema = searchParams.get("schema")
  const queryClient = useQueryClient()
  const editorRef = useRef<any>(null)
  
  const autoRunTriggered = useRef(false)
  const shouldAutoRun = searchParams.get("run") === "true"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [schemaName, setSchemaName] = useState("") // New state for schema
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
      const url = schemaName 
        ? `${API_ROUTES.BACKUP}/${id}/tables?name=${schemaName}`
        : `${API_ROUTES.BACKUP}/${id}/tables`
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
      setSchemaName(queryData.schemaName || schema || "")
    }
  }, [queryData, schema])

  useEffect(() => {
    if (monaco && tables) {
      const keywords = [
        "SELECT",
        "FROM",
        "WHERE",
        "LIMIT",
        "ORDER BY",
        "GROUP BY",
        "INSERT",
        "UPDATE",
        "DELETE",
        "JOIN",
        "LEFT JOIN",
        "RIGHT JOIN",
        "INNER JOIN",
        "ON",
        "AND",
        "OR",
        "IN",
        "IS NULL",
        "IS NOT NULL",
        "DESC",
        "ASC",
        "INTO",
        "VALUES",
        "SET",
        "TABLE",
        "DATABASE",
        "SCHEMA",
        "CREATE",
        "DROP",
      ]

      const completionProvider =
        monaco.languages.registerCompletionItemProvider("sql", {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }

            const suggestions = [
              ...keywords.map((k) => ({
                label: k,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: k,
                range: range,
              })),
              ...(tables || []).map((table: any) => ({
                label: table.name,
                kind: monaco.languages.CompletionItemKind.Struct,
                insertText: table.name,
                range: range,
                detail: "Table",
                documentation:
                  table.description || `Database table: ${table.name}`,
              })),
            ]

            return { suggestions }
          },
        })

      return () => completionProvider.dispose()
    }
  }, [monaco, tables])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backup/query/${editorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sql, schemaName }), // Pass schemaName
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

        // If there's a selection, run only that
        if (selection && !selection.isEmpty()) {
          sqlToRun = model.getValueInRange(selection)
        } else {
          // Find current statement delimited by ;
          const position = editor.getPosition()
          const text = model.getValue()
          const lines = text.split("\n")

          // Simple semicolon parser
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
            currentPos = end + 1 // +1 for the semicolon
          }
        }
      }

      if (!sqlToRun || sqlToRun.trim() === "") {
        throw new Error("No SQL query found at cursor or selection")
      }

      // Execute raw SQL instead of the saved script ID
      const res = await fetch(`/api/backup/${id}/queries/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to execute query")
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

  // Auto-run logic
  useEffect(() => {
    if (shouldAutoRun && !isLoading && queryData && !autoRunTriggered.current) {
      autoRunTriggered.current = true
      const timer = setTimeout(() => {
        executeMutation.mutate()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoRun, isLoading, queryData, executeMutation])

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backup/query/${editorId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Script deleted")
      router.push(`/admin/backup/${id}/tables`)
    },
  })

  if (isLoading) return <div className="p-8">Loading script...</div>
  if (!queryData) return <div className="p-8">Script not found</div>

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {queryData.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {queryData.backupConfig.databaseName}
              {queryData.schemaName ? ` / ${queryData.schemaName}` : ""} @{" "}
              {queryData.backupConfig.host}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this script?")) {
                deleteMutation.mutate()
              }
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            size="sm"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
          >
            <Play className="mr-2 h-4 w-4" />
            {executeMutation.isPending ? "Running..." : "Run Query"}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 overflow-hidden px-8 pb-8 md:grid-cols-12">
        <div className="custom-scrollbar space-y-4 overflow-auto pr-2 md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Script Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Script Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schemaName">Database Schema (Optional for PG)</Label>
                <Input 
                  id="schemaName" 
                  placeholder="e.g. public" 
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  Created: {new Date(queryData.createdAt).toLocaleString()}
                </div>
                <div>
                  Updated: {new Date(queryData.updatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {tables && (
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TableIcon className="h-4 w-4" />
                  Tables
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Click to append SELECT query
                </CardDescription>
              </CardHeader>
              <CardContent className="custom-scrollbar flex-1 overflow-auto border-t p-0">
                <div className="divide-y divide-border">
                  {tables.map((table: any) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        const newQuery = `\n\n-- Query for ${table.name}\nSELECT * FROM ${table.name} LIMIT 10;`
                        setSql((prev) => prev + newQuery)
                      }}
                      className="group flex w-full items-center justify-between px-4 py-2 text-left text-xs transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate font-mono text-muted-foreground group-hover:text-primary">
                        {table.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {table.rows?.toLocaleString() || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(results) ? results.length : 0} rows returned
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-4 md:col-span-9">
          <Card className="flex min-h-[220px] flex-col md:min-h-0 md:flex-1">
            <CardHeader className="border-b px-4 py-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4" />
                Query Editor
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Ctrl + Enter to Run
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[120px] flex-1 p-0 md:min-h-0">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={sql}
                onChange={(value) => setSql(value || "")}
                onMount={(editor, monaco) => {
                  editorRef.current = editor
                  editor.addCommand(
                    monaco.KeyMod.Ctrl | monaco.KeyCode.Enter,
                    () => {
                      executeMutation.mutate()
                    }
                  )
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  padding: { top: 10, bottom: 10 },
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false,
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card className="flex min-h-[220px] flex-col md:min-h-0 md:flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-2">
              <div className="space-y-0.5">
                <CardTitle className="text-sm">Results</CardTitle>
                <CardDescription className="text-[10px]">
                  {results
                    ? `${Array.isArray(results) ? results.length : 0} rows found`
                    : "Run query to see results"}
                </CardDescription>
              </div>
              {results && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => setResults(null)}
                >
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent className="min-h-[120px] flex-1 p-0 md:min-h-0">
              <div className="h-full overflow-auto">
                {results && Array.isArray(results) && results.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-muted">
                      <tr>
                        {Object.keys(results[0]).map((key) => (
                          <th
                            key={key}
                            className="border-r border-b px-3 py-2 text-left font-medium last:border-r-0"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {results.map((row, i) => (
                        <tr
                          key={i}
                          className="transition-colors hover:bg-muted/50"
                        >
                          {Object.values(row).map((val: any, j) => (
                            <td
                              key={j}
                              className="max-w-[200px] overflow-hidden border-r px-3 py-2 text-ellipsis whitespace-nowrap last:border-r-0"
                            >
                              {val === null ? (
                                <span className="text-muted-foreground italic">
                                  null
                                </span>
                              ) : typeof val === "object" ? (
                                <span className="font-mono text-[10px] text-blue-400">
                                  {JSON.stringify(val).substring(0, 50)}...
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : executeMutation.isPending ? (
                  <div className="flex h-full animate-pulse items-center justify-center text-muted-foreground">
                    Executing query...
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {results
                      ? "No results found for this query."
                      : "Results will appear here."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
