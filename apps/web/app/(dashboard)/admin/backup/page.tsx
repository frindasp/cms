"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Database, MoreHorizontal, Edit, Trash, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { DataTable } from "@/components/data-table";
import { CountdownProgress } from "@/components/countdown-progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@workspace/ui/components/dropdown-menu";
import { APP_ROUTES, API_ROUTES } from "@/lib/constants";
import { ColumnDef } from "@tanstack/react-table";
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

export default function BackupListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["backup-configs", page],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}?page=${page}&limit=10`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-configs"] });
      toast.success("Configuration deleted successfully");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Delete failed", { description: error.message });
      setDeleteId(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (config: any) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(`${API_ROUTES.BACKUP}/${config.id}/test`, {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        // The API doesn't return data.success, it just returns a 200 plain object or 400 { error }
        if (!res.ok) throw new Error(data.error || "Connection failed");
        return { response: data, config };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error("Connection testing timed out after 20 seconds.");
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      toast.success(`Connected to ${data.config.databaseName} (${data.config.databaseType})`, { 
        description: data.response?.message || "Connection test successful." 
      });
    },
    onError: (error: any, config: any) => {
      toast.error(`Failed connecting to ${config.databaseName} (${config.databaseType})`, { 
        description: error.message 
      });
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      id: "actions",
      cell: ({ row }) => {
        const config = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.ADMIN.BACKUP.EDIT.replace("[id]", config.id)} className="flex items-center">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    toast.loading(`Testing ${config.databaseName} (${config.databaseType})`, { 
                      id: `test-${config.id}`,
                      description: <CountdownProgress initialCount={20} text="Checking database connection..." />
                    });
                    testMutation.mutate(config, {
                      onSettled: () => toast.dismiss(`test-${config.id}`)
                    });
                  }}
                  className="cursor-pointer"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Test Connection
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteId(config.id)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Database className="h-4 w-4 text-muted-foreground" />
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "databaseType",
      header: "Type",
    },
    {
      accessorKey: "host",
      header: "Host",
      cell: ({ row }) => (
        <div 
          className="max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px] truncate" 
          title={row.getValue("host")}
        >
          {row.getValue("host")}
        </div>
      ),
    },
    {
      accessorKey: "databaseName",
      header: "Database/Bucket",
      cell: ({ row }) => (
        <div 
          className="max-w-[150px] sm:max-w-[200px] md:max-w-[250px] truncate" 
          title={row.getValue("databaseName")}
        >
          {row.getValue("databaseName")}
        </div>
      ),
    },
  ];


  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Backup Configurations</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href={APP_ROUTES.ADMIN.BACKUP.CREATE}>
              <Plus className="mr-2 h-4 w-4" />
              New Config
            </Link>
          </Button>
        </div>
      </div>
      
      <DataTable
        columns={columns}
        data={data?.data || []}
        pageIndex={page}
        pageSize={10}
        totalCount={data?.total || 0}
        onPageChange={setPage}
        isLoading={isLoading}
        onRowClick={(row) => window.open(APP_ROUTES.ADMIN.BACKUP.DETAIL.replace("[id]", row.id), '_blank')}
      />


      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              database backup configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
