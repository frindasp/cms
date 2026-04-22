"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Save, Play, Code, Trash, Table as TableIcon, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Editor, { useMonaco } from "@monaco-editor/react";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { API_ROUTES } from "@/lib/constants";
import { Badge } from "@workspace/ui/components/badge";

export default function SchemaBackupQueryCreatePage() {
  const params = useParams();
  const id = params.id as string;
  const schemaName = params.schemaName as string;
  const router = useRouter();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sql, setSql] = useState(`SET search_path TO ${schemaName};\n\nSELECT * FROM users LIMIT 10;`);
  const [results, setResults] = useState<any[] | null>(null);

  const { data: config } = useQuery({
    queryKey: ["backup-config", id],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: tables } = useQuery({
    queryKey: ["backup-tables", id, schemaName],
    queryFn: async () => {
      const url = `${API_ROUTES.BACKUP}/${id}/tables?name=${schemaName}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    },
  });

  useEffect(() => {
    if (monaco && tables) {
      const keywords = [
        "SELECT", "FROM", "WHERE", "LIMIT", "ORDER BY", "GROUP BY", "INSERT", 
        "UPDATE", "DELETE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", 
        "ON", "AND", "OR", "IN", "IS NULL", "IS NOT NULL", "DESC", "ASC",
        "INTO", "VALUES", "SET", "TABLE", "DATABASE", "SCHEMA", "CREATE", "DROP"
      ];

      const completionProvider = monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = [
            ...keywords.map(k => ({
              label: k,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: k,
              range: range
            })),
            ...(tables || []).map((table: any) => ({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText: table.name,
              range: range,
              detail: "Table",
              documentation: table.description || `Database table: ${table.name}`
            }))
          ];

          return { suggestions };
        },
      });

      return () => completionProvider.dispose();
    }
  }, [monaco, tables]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/backup/${id}/queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sql, schemaName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create script");
      return data.data;
    },
    onSuccess: (data) => {
      toast.success("Script saved successfully");
      router.push(`/admin/backup/${id}/schemas/${schemaName}/tables/editor/${data.id}`);
    },
    onError: (error: any) => {
      toast.error("Error saving script", { description: error.message });
    }
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      setResults(null);
      let sqlToRun = sql;
      if (editorRef.current) {
        const editor = editorRef.current;
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (selection && !selection.isEmpty()) {
          sqlToRun = model.getValueInRange(selection);
        } else {
          const position = editor.getPosition();
          const text = model.getValue();
          const statements = text.split(";");
          let currentPos = 0;
          const cursorIndex = model.getOffsetAt(position);
          for (let s of statements) {
            const start = currentPos;
            const end = currentPos + s.length;
            if (cursorIndex >= start && cursorIndex <= end + 1) {
              sqlToRun = s.trim();
              break;
            }
            currentPos = end + 1;
          }
        }
      }

      if (!sqlToRun || sqlToRun.trim() === "") throw new Error("No SQL query found");

      const res = await fetch(`/api/backup/${id}/queries/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute");
      return data.data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success("Query executed successfully");
    },
    onError: (error: any) => {
      toast.error("Execution failed", { description: error.message });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/admin/backup/${id}/schemas/${schemaName}/tables/editor`} className="hover:text-primary transition-colors">SQL Scripts</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Create New</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">New SQL Script</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                 <Badge variant="outline">{schemaName}</Badge>
                 <span>for {config?.name || '...'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
            <Play className="mr-2 h-4 w-4" />
            Run Query
          </Button>
          <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name}>
            <Save className="mr-2 h-4 w-4" />
            Save Script
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 flex-1 px-8 pb-8 overflow-hidden">
        <div className="md:col-span-3 space-y-4 overflow-auto pr-2 custom-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Script Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. List Users" />
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
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Tables
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 border-t flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-border">
                  {tables.map((table: any) => (
                    <button
                      key={table.name}
                      onClick={() => setSql(prev => prev + `\n\nSELECT * FROM ${table.name} LIMIT 10;`)}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-muted/50 flex items-center justify-between group"
                    >
                      <span className="font-mono text-muted-foreground group-hover:text-primary truncate">{table.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-9 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 p-0">
              <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={sql}
                onChange={(v) => setSql(v || "")}
                onMount={(e) => { editorRef.current = e; }}
              />
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
  );
}
