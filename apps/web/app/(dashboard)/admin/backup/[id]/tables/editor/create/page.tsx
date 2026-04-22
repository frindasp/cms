"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Save, Play, Code, Trash, Table as TableIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Editor, { useMonaco } from "@monaco-editor/react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";
import { API_ROUTES } from "@/lib/constants";
import { Badge } from "@workspace/ui/components/badge";

export default function BackupQueryCreatePage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const schema = searchParams.get("schema");
  const router = useRouter();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sql, setSql] = useState(schema ? `SET search_path TO ${schema};\n\nSELECT * FROM users LIMIT 10;` : "SELECT * FROM users LIMIT 10;");
  const [results, setResults] = useState<any[] | null>(null);

  const { data: tables } = useQuery({
    queryKey: ["backup-tables", id, schema],
    queryFn: async () => {
      const url = schema 
        ? `${API_ROUTES.BACKUP}/${id}/tables?name=${schema}`
        : `${API_ROUTES.BACKUP}/${id}/tables`;
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
        body: JSON.stringify({ name, description, sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create script");
      return data.data;
    },
    onSuccess: (data) => {
      toast.success("Script saved successfully");
      router.push(`/admin/backup/${id}/tables/editor/${data.id}`);
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

      if (!sqlToRun || sqlToRun.trim() === "") {
        throw new Error("No SQL query found at cursor or selection");
      }

      const res = await fetch(`/api/backup/${id}/queries/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute query");
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">SQL Editor</h2>
            <p className="text-muted-foreground text-sm">Create and save SQL scripts for this database.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {executeMutation.isPending ? "Running..." : "Run Query"}
          </Button>
          <Button 
            size="sm"
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending || !name || !sql}
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Saving..." : "Save Script"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 flex-1 px-8 pb-8 overflow-hidden">
        <div className="md:col-span-3 space-y-4 overflow-auto pr-2 custom-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle>Script Details</CardTitle>
              <CardDescription>Give your script a name and description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Script Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Get Recent Users" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe what this script does..." 
                  className="min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
                <CardDescription className="text-[10px]">Click to append SELECT query</CardDescription>
              </CardHeader>
              <CardContent className="p-0 border-t flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-border">
                  {tables.map((table: any) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        const newQuery = `\n\n-- Query for ${table.name}\nSELECT * FROM ${table.name} LIMIT 10;`;
                        setSql(prev => prev + newQuery);
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-muted/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="font-mono text-muted-foreground group-hover:text-primary truncate">{table.name}</span>
                      <span className="text-[10px] text-muted-foreground/50">{table.rows?.toLocaleString() || 0}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-9 flex flex-col gap-4 min-h-0">
          <Card className="flex min-h-[220px] flex-col md:min-h-0 md:flex-1">
            <CardHeader className="py-2 px-4 border-b">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4" />
                Query Editor
                <Badge variant="outline" className="ml-auto text-[10px]">Ctrl + Enter to Run</Badge>
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
                  editorRef.current = editor;
                  editor.addCommand(monaco.KeyMod.Ctrl | monaco.KeyCode.Enter, () => {
                    executeMutation.mutate();
                  });
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
                  quickSuggestions: { other: true, comments: false, strings: false },
                }}
              />
            </CardContent>
          </Card>

          <Card className="flex min-h-[220px] flex-col md:min-h-0 md:flex-1">
            <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <CardTitle className="text-sm">Results</CardTitle>
                <CardDescription className="text-[10px]">
                  {results ? `${Array.isArray(results) ? results.length : 0} rows found` : "Run query to see results"}
                </CardDescription>
              </div>
              {results && (
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setResults(null)}>
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent className="min-h-[120px] flex-1 p-0 md:min-h-0">
              <div className="h-full overflow-auto">
                {results && Array.isArray(results) && results.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        {Object.keys(results[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left font-medium border-b border-r last:border-r-0">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/50 transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-3 py-2 border-r last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                              {val === null ? (
                                <span className="text-muted-foreground italic">null</span>
                              ) : typeof val === 'object' ? (
                                <span className="text-blue-400 font-mono text-[10px]">{JSON.stringify(val).substring(0, 50)}...</span>
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
                  <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">
                    Executing query...
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {results ? "No results found for this query." : "Results will appear here."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
