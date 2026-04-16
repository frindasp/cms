"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
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
  Trash2,
  ChevronRight,
  Trash,
  Table as TableIcon,
  Activity,
  Save,
  X,
  Copy,
  MoreHorizontal,
  DownloadCloud
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CountdownProgress } from "@/components/countdown-progress";


import { API_ROUTES } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { PasswordInput } from "@workspace/ui/components/password-input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BackupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [schemaToDrop, setSchemaToDrop] = useState<string | null>(null);
  
  // Clone feature state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [cloneLogId, setCloneLogId] = useState("");

  // Alert dialogs state
  const [rollbackLogId, setRollbackLogId] = useState<string | null>(null);
  const [restoreLogId, setRestoreLogId] = useState<string | null>(null);

  // Inline editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const { data: allConfigs } = useQuery({
    queryKey: ["backup-configs", "all"],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}?page=1&limit=100`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: cloneDialogOpen,
  });

  const { data: sourceConfigDetails } = useQuery({
    queryKey: ["backup-config", cloneSourceId],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${cloneSourceId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!cloneSourceId && cloneDialogOpen,
  });

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
      // 1. First test connection
      const testRes = await fetch(`${API_ROUTES.BACKUP}/${id}/test`, {
        method: "POST",
      });
      const testData = await testRes.json();
      if (!testRes.ok) {
        throw new Error(`Connection test failed: ${testData.error || "Unknown error"}`);
      }

      // 2. If connection OK, proceed with backup
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

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLogId: cloneLogId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup clone failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Backup successful", {
        description: data.message
      });
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
      setCloneDialogOpen(false);
      setCloneSourceId("");
      setCloneLogId("");
    },
    onError: (error: any) => {
      toast.error("Failed to backup from source", {
        description: error.message
      });
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
      setRollbackLogId(null);
    },
    onError: (error: any) => {
      toast.error("Rollback failed", {
        description: error.message
      });
      setRollbackLogId(null);
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
      setRestoreLogId(null);
    },
    onError: (error: any) => {
      toast.error("Restore failed", {
        description: error.message
      });
      setRestoreLogId(null);
    }
  });

  const dropSchemaMutation = useMutation({
    mutationFn: async (schemaName: string) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}/schemas?name=${schemaName}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop schema");
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["backup-schemas", id] });
      setSchemaToDrop(null);
    },
    onError: (error: any) => {
      toast.error("Failed to drop schema", {
        description: error.message
      });
    }
  });

  const switchSchemaMutation = useMutation({
    mutationFn: async (schemaName: string) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}/switch?name=${schemaName}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch schema");
      return data.data;
    },
    onSuccess: (data: any) => {
      router.push(`/admin/backup/${data.id}`);
      toast.success(`Switched to ${data.databaseName}`);
    },
    onError: (error: any) => {
      toast.error("Failed to switch schema", {
        description: error.message
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update configuration");
      return data.data;
    },
    onSuccess: () => {
      toast.success("Configuration updated locally (Database sync might be needed)");
      queryClient.invalidateQueries({ queryKey: ["backup-config", id] });
      setEditingSection(null);
    },
    onError: (error: any) => {
      toast.error("Update failed", { description: error.message });
    }
  });

  const testConnectionMutation = useMutation({
    onMutate: () => {
      const toastId = toast.loading("Testing Connection", { 
        description: <CountdownProgress initialCount={20} text={`Connecting to ${config?.databaseName}...`} /> 
      });
      return { toastId };
    },
    mutationFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(`${API_ROUTES.BACKUP}/${id}/test`, {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Connection failed");
        return data;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error("Connection testing timed out after 20 seconds.");
        }
        throw err;
      }
    },
    onSuccess: (data, variables, context) => {
      toast.success("Connection test successful", {
        id: context?.toastId,
        description: data.message
      });
    },
    onError: (error: any, variables, context) => {
      toast.error("Connection failed", {
        id: context?.toastId,
        description: error.message
      });
    }
  });

  const startEditing = (section: string) => {
    setEditingSection(section);
    setEditValues({
      databaseType: config.databaseType,
      host: config.host,
      port: config.port,
      databaseName: config.databaseName,
      username: config.username,
      password: config.password,
      options: config.options ? JSON.stringify(config.options, null, 2) : "",
    });
  };

  const handleSave = () => {
    const valuesToSave = { ...editValues };
    if (editingSection === 'connection') {
      try {
        valuesToSave.options = valuesToSave.options ? JSON.parse(valuesToSave.options) : null;
      } catch (e) {
        toast.error("Invalid JSON in Extra Options");
        return;
      }
    }
    updateMutation.mutate(valuesToSave);
  };

  const handleExplore = (e?: React.MouseEvent, schemaName?: string) => {
    if (e) e.stopPropagation();
    testConnectionMutation.mutate(undefined, {
      onSuccess: () => {
        const url = schemaName ? `/admin/backup/${id}/tables?name=${schemaName}` : `/admin/backup/${id}/tables`;
        router.push(url);
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  if (!config) return <div className="p-8">Configuration not found</div>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{config.name}</h2>
          <p className="text-sm text-muted-foreground whitespace-normal">Manage and monitor backups for this database.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => testConnectionMutation.mutate()} disabled={testConnectionMutation.isPending} className="flex-1 md:flex-none">
            <Activity className={`mr-2 h-4 w-4 ${testConnectionMutation.isPending ? "animate-spin" : ""}`} />
            <span className="truncate">{testConnectionMutation.isPending ? "Testing..." : "Test Connection"}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 md:flex-none"
            onClick={(e) => handleExplore(e)}
            disabled={testConnectionMutation.isPending}
          >
            <TableIcon className="mr-2 h-4 w-4" />
            <span className="truncate">Explore Tables</span>
          </Button>
          <div className="flex w-full md:w-auto">
            <Button size="sm" onClick={() => runBackupMutation.mutate()} disabled={runBackupMutation.isPending} className="w-full md:w-auto rounded-r-none">
              <Play className="mr-2 h-4 w-4" />
              {runBackupMutation.isPending ? "Running..." : "Run Backup Now"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2" disabled={runBackupMutation.isPending}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCloneDialogOpen(true)}>
                  <DownloadCloud className="mr-2 h-4 w-4 text-muted-foreground" />
                  Backup from other Source
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          onDoubleClick={() => startEditing('type')} 
          className={`cursor-pointer transition-all ${editingSection === 'type' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          title="Double click to edit"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Type</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {editingSection === 'type' ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <select 
                  className="w-full bg-background border rounded px-2 py-1 text-sm h-9"
                  value={editValues.databaseType}
                  onChange={(e) => setEditValues({ ...editValues, databaseType: e.target.value })}
                >
                  <option value="TIDB">TiDB</option>
                  <option value="SUPABASE">Supabase</option>
                </select>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditingSection(null)} className="h-7 w-7"><X className="h-3 w-3" /></Button>
                  <Button size="icon" variant="secondary" onClick={handleSave} className="h-7 w-7" disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold">{config.databaseType}</div>
            )}
          </CardContent>
        </Card>
        <Card 
          onDoubleClick={() => startEditing('host')}
          className={`cursor-pointer transition-all ${editingSection === 'host' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          title="Double click to edit"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Address</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {editingSection === 'host' ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-background border rounded px-2 py-1 text-xs"
                    value={editValues.host}
                    onChange={(e) => setEditValues({ ...editValues, host: e.target.value })}
                    placeholder="Host"
                  />
                  <input 
                    className="w-20 bg-background border rounded px-2 py-1 text-xs"
                    value={editValues.port}
                    onChange={(e) => setEditValues({ ...editValues, port: parseInt(e.target.value) || 0 })}
                    placeholder="Port"
                    type="number"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditingSection(null)} className="h-7 w-7"><X className="h-3 w-3" /></Button>
                  <Button size="icon" variant="secondary" onClick={handleSave} className="h-7 w-7" disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="text-lg font-bold truncate tracking-tight">{config.host}:{config.port}</div>
            )}
          </CardContent>
        </Card>
        <Card 
          onDoubleClick={() => startEditing('target')}
          className={`cursor-pointer transition-all ${editingSection === 'target' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          title="Double click to edit"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Database</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {editingSection === 'target' ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <input 
                  className="w-full bg-background border rounded px-2 py-1 text-sm h-9"
                  value={editValues.databaseName}
                  onChange={(e) => setEditValues({ ...editValues, databaseName: e.target.value })}
                  placeholder="Database Name"
                />
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditingSection(null)} className="h-7 w-7"><X className="h-3 w-3" /></Button>
                  <Button size="icon" variant="secondary" onClick={handleSave} className="h-7 w-7" disabled={updateMutation.isPending}><Save className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold">{config.databaseName}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card 
          onDoubleClick={() => startEditing('connection')}
          className={`col-span-1 lg:col-span-3 cursor-pointer transition-all ${editingSection === 'connection' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
          title="Double click to edit"
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Connection Details</CardTitle>
            {editingSection === 'connection' && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)} className="h-8"><X className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button size="sm" variant="secondary" onClick={handleSave} className="h-8" disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {editingSection === 'connection' ? (
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Username:</span>
                  </div>
                  <input 
                    className="w-full bg-background border rounded px-2 py-1 text-sm h-9"
                    value={editValues.username}
                    onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Password:</span>
                  </div>
                  <PasswordInput 
                    className="w-full bg-background border rounded px-2 py-1 text-sm h-9"
                    value={editValues.password}
                    onChange={(e) => setEditValues({ ...editValues, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">Extra Options (JSON):</span>
                  </div>
                  <textarea 
                    className="w-full bg-background border rounded px-2 py-1 text-xs h-32 font-mono scrollbar-hide"
                    value={editValues.options}
                    onChange={(e) => setEditValues({ ...editValues, options: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
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
                    <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-[150px]">
                      {JSON.stringify(config.options, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-4">
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
              {(config.backups || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  No backups recorded yet.
                </div>
              ) : (
                config.backups.map((backup: any) => (
                  <div key={backup.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {backup.status === "SUCCESS" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : backup.status === "FAILED" ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{backup.fileName || `backup_${backup.id.slice(0, 8)}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleString()}
                        </p>
                        {backup.error && (
                          <p className="text-xs text-destructive mt-1 font-medium italic line-clamp-2">
                            Error: {backup.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2">
                        {backup.fileSize && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {(Number(backup.fileSize) / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                        <Badge variant={backup.status === "SUCCESS" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0 h-5">
                          {backup.status}
                        </Badge>
                      </div>
                      
                      {backup.status === "SUCCESS" && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => window.open(`${API_ROUTES.BACKUP}/download/${backup.id}`)}
                            title="Download Backup"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => setRollbackLogId(backup.id)}
                            title="Rollback (Delete Schema)"
                            disabled={rollbackMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => setRestoreLogId(backup.id)}
                            title="Restore to Database"
                            disabled={restoreMutation.isPending}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
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

        <Card className="col-span-1 lg:col-span-7">
          <CardHeader>
            <CardTitle>All Databases</CardTitle>
            <CardDescription>Advanced details for each found schema on the server.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-right font-medium">Tables</th>
                    <th className="px-4 py-2 text-right font-medium">Size</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingSchemas ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">Fetching data...</td></tr>
                  ) : schemas?.length > 0 ? (
                    schemas.map((s: any) => (
                      <tr 
                        key={s.name} 
                        className={`group cursor-pointer hover:bg-muted/50 transition-colors ${s.name === config.databaseName ? "bg-emerald-500/10 font-medium" : ""}`}
                        onClick={() => switchSchemaMutation.mutate(s.name)}
                      >
                        <td className="px-4 py-2 flex items-center gap-2 truncate">
                          <span className="truncate max-w-[150px] md:max-w-none">{s.name}</span>
                          {s.name === config.databaseName && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {s.tableCount !== undefined ? s.tableCount : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground whitespace-nowrap">
                          {(s.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={(e) => handleExplore(e, s.name)}
                              title={`Explore ${s.name} tables`}
                              disabled={testConnectionMutation.isPending}
                            >
                              <TableIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSchemaToDrop(s.name);
                              }}
                              disabled={dropSchemaMutation.isPending}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground self-center ml-1" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No schemas found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!schemaToDrop} onOpenChange={(open) => !open && setSchemaToDrop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop Database Schema?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to drop the schema <span className="font-bold text-destructive underline">{schemaToDrop}</span>?
              This action is permanent and will DELETE all data and tables within this schema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => schemaToDrop && dropSchemaMutation.mutate(schemaToDrop)}
              disabled={dropSchemaMutation.isPending}
            >
              {dropSchemaMutation.isPending ? "Dropping..." : "Drop Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rollbackLogId} onOpenChange={(open) => !open && setRollbackLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this backup? This action is permanent and will <span className="font-bold text-destructive">DELETE the backup schema</span> from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rollbackLogId && rollbackMutation.mutate(rollbackLogId)}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending ? "Rolling back..." : "Confirm Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!restoreLogId} onOpenChange={(open) => !open && setRestoreLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this backup? This may <span className="font-bold">overwrite current data</span> in your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => restoreLogId && restoreMutation.mutate(restoreLogId)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Confirm Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup from other Source</DialogTitle>
            <DialogDescription>
              Copy a backup file from another database configuration and back it up into this database ({config.databaseName}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Source Configuration</label>
              <select 
                className="w-full bg-background border rounded px-3 py-2 text-sm"
                value={cloneSourceId}
                onChange={(e) => {
                  setCloneSourceId(e.target.value);
                  setCloneLogId(""); // Reset backup selection
                }}
              >
                <option value="" disabled>-- Select Configuration --</option>
                {allConfigs?.filter((c: any) => c.id !== id).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.databaseType})</option>
                ))}
              </select>
            </div>
            {cloneSourceId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Backup Data</label>
                <select 
                  className="w-full bg-background border rounded px-3 py-2 text-sm"
                  value={cloneLogId}
                  onChange={(e) => setCloneLogId(e.target.value)}
                >
                  <option value="" disabled>-- Select Backup --</option>
                  {sourceConfigDetails?.backups?.filter((b: any) => b.status === "SUCCESS").map((b: any) => (
                    <option key={b.id} value={b.id}>{b.fileName} ({(Number(b.fileSize)/1024/1024).toFixed(2)} MB)</option>
                  )) || (
                    <option disabled>No successful backups available</option>
                  )}
                  {sourceConfigDetails?.backups?.filter((b: any) => b.status === "SUCCESS").length === 0 && (
                    <option disabled>No successful backups available</option>
                  )}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => cloneMutation.mutate()} 
              disabled={!cloneSourceId || !cloneLogId || cloneMutation.isPending}
            >
              {cloneMutation.isPending ? "Backing up..." : "Clone & Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
