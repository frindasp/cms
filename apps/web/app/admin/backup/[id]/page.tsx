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
  Clock
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

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      // Logic for triggering backup would go here
      // For now, we'll just mock it
      await new Promise(r => setTimeout(r, 2000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Backup process started", {
        description: "You can monitor the progress in the history tab."
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
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
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.backups?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No backup history found.
                </div>
              ) : (
                config.backups?.map((backup: any) => (
                  <div key={backup.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {backup.status === "SUCCESS" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : backup.status === "FAILED" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                      )}
                      <div>
                        <div className="font-medium">{backup.fileName || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(backup.createdAt), "PPP p")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {backup.fileSize && (
                        <span className="text-sm font-medium">
                          {(Number(backup.fileSize) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                      <Badge variant={backup.status === "SUCCESS" ? "default" : "destructive"}>
                        {backup.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
