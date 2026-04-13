"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database, 
  Server, 
  MapPin, 
  User, 
  Lock, 
  Settings, 
  Play, 
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Trash2
} from "lucide-react";


import { API_ROUTES } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BackupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["backup-config", id],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["backup-schemas", id],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}/schemas`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!config,
  });


  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Backup successful", {
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
    },
    onError: (error: any) => {
      toast.error("Backup failed", {
        description: error.message
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
    }
  });


  const rollbackMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/rollback/${logId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rollback failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Rollback successful", {
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
    },
    onError: (error: any) => {
      toast.error("Rollback failed", {
        description: error.message
      });
    }
  });

  const restoreMutation = useMutation({

    mutationFn: async (logId: string) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/restore/${logId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Restore successful", {
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
    },
    onError: (error: any) => {
      toast.error("Restore failed", {
        description: error.message
      });
    }
  });

  if (isLoading) return <div className="p-8">Loading...</div>;

  if (!config) return <div className="p-8">Configuration not found</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config.name}</h2>
          <p className="text-muted-foreground">Manage and monitor backups for this database.</p>
        </div>
        <Button onClick={() => runBackupMutation.mutate()} disabled={runBackupMutation.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {runBackupMutation.isPending ? "Running..." : "Run Backup Now"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Type</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config.databaseType}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Address</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{config.host}:{config.port}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Database</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config.databaseName}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Username:</span>
              <span>{config.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Password:</span>
              <span>••••••••</span>
            </div>
            {config.options && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Extra Options:</span>
                </div>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(config.options, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Backups</CardTitle>
                <CardDescription>History of the last 10 backup attempts.</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["backup-config", id] })}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.logs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  No backups recorded yet.
                </div>
              ) : (
                config.logs.map((backup: any) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      {backup.status === "SUCCESS" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : backup.status === "FAILED" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                      )}
                      <div>
                        <p className="font-medium">{backup.fileName || `backup_${backup.id.slice(0, 8)}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleString()}
                        </p>
                        {backup.error && (
                          <p className="text-xs text-destructive mt-1 font-medium italic">
                            Error: {backup.error}
                          </p>
                        )}
                      </div>

                    </div>
                    <div className="flex items-center gap-2">
                      {backup.fileSize && (
                        <span className="text-sm font-medium">
                          {(Number(backup.fileSize) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                      <Badge variant={backup.status === "SUCCESS" ? "default" : "destructive"}>
                        {backup.status}
                      </Badge>
                      
                      {backup.status === "SUCCESS" && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => window.open(`${API_ROUTES.BACKUP}/download/${backup.id}`)}
                            title="Download Backup"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              if (confirm("Are you sure you want to rollback this backup? This will DELETE the backup schema from the database.")) {
                                rollbackMutation.mutate(backup.id);
                              }
                            }}
                            title="Rollback (Delete Schema)"
                            disabled={rollbackMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              if (confirm("Are you sure you want to restore this backup? This may overwrite current data.")) {
                                restoreMutation.mutate(backup.id);
                              }
                            }}
                            title="Restore to Database"
                            disabled={restoreMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>

                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>All {config.databaseType === 'COUCHBASE' ? 'Buckets' : 'Databases'}</CardTitle>
            <CardDescription>Advanced details for each found schema on the server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-right font-medium">Tables</th>
                    <th className="px-4 py-2 text-right font-medium">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingSchemas ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Fetching data...</td></tr>
                  ) : schemas?.length > 0 ? (
                    schemas.map((s: any) => (
                      <tr key={s.name} className={s.name === config.databaseName ? "bg-emerald-500/10 font-medium" : ""}>
                        <td className="px-4 py-2 flex items-center gap-2">
                          {s.name}
                          {s.name === config.databaseName && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {s.tableCount !== undefined ? s.tableCount : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {(s.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No schemas found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
