"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Table as TableIcon, 
  ChevronLeft, 
  Database, 
  Search,
  HardDrive,
  Rows,
  Calendar,
  Info,
  Code,
  Plus,
  Play,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { API_ROUTES } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";

export default function SchemaTablesPage() {
  const params = useParams();
  const id = params.id as string;
  const schemaName = params.schemaName as string;
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["backup-config", id],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ["backup-tables", id, schemaName],
    queryFn: async () => {
      const url = `${API_ROUTES.BACKUP}/${id}/tables?name=${schemaName}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!config,
  });

  const filteredTables = (tables || []).filter((table: any) => 
    table.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoadingConfig || isLoadingTables) return <div className="p-8">Loading tables data...</div>;
  if (!config) return <div className="p-8">Configuration not found</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-2 mb-2">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
         </Button>
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin/backup" className="hover:text-primary transition-colors">Backups</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/admin/backup/${id}`} className="hover:text-primary transition-colors">{config.name}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/admin/backup/${id}/schemas/${schemaName}`} className="hover:text-primary transition-colors">{schemaName}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">Tables</span>
         </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tables Explorer</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>{schemaName}</span>
            <Badge variant="outline" className="ml-2">{config.databaseType}</Badge>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/backup/${id}/tables/editor`}>
              <Code className="mr-2 h-4 w-4" />
              Scripts
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/backup/${id}/tables/editor/create${config.databaseType === 'postgresql' || config.databaseType === 'supabase' ? `?schema=${schemaName}` : ''}`}>
              <Plus className="mr-2 h-4 w-4" />
              New Script
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredTables.length} of {tables?.length || 0} tables
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Table Name</th>
                  <th className="px-4 py-3 text-right font-medium">Rows</th>
                  <th className="px-4 py-3 text-right font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTables.length > 0 ? (
                  filteredTables.map((table: any) => (
                    <tr key={table.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-4 w-4 text-primary/70" />
                          <span className="font-medium">{table.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {table.rowCount !== undefined ? table.rowCount.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {table.sizeBytes !== undefined ? (table.sizeBytes / 1024 / 1024).toFixed(3) + ' MB' : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                      {search ? "No tables match your search." : "No tables found in this schema."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approx. Total Rows</CardTitle>
            <Rows className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(tables || []).reduce((acc: number, t: any) => acc + (t.rowCount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((tables || []).reduce((acc: number, t: any) => acc + (t.sizeBytes || 0), 0) / 1024 / 1024).toFixed(2)} MB
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
