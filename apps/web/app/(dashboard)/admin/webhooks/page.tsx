"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";

type Webhook = {
  id: string;
  created_at: string;
  status: string;
  endpoint: string;
  events: string[];
};

export default function WebhooksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch webhooks");
      }
      return res.json();
    },
  });

  const columns: ColumnDef<Webhook>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "endpoint",
      header: "Endpoint",
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {row.getValue("endpoint")}
        </span>
      ),
    },
    {
      accessorKey: "events",
      header: "Events",
      cell: ({ row }) => {
        const events: string[] = row.getValue("events");
        return (
          <div className="flex flex-wrap gap-1">
            {events.map((event) => (
              <Badge key={event} variant="secondary" className="text-xs">
                {event}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status: string = row.getValue("status");
        return (
          <Badge
            variant={status === "enabled" ? "default" : "destructive"}
            className="capitalize"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resend Webhooks</h1>
        <p className="text-muted-foreground">
          Manage and view your configured webhooks from Resend.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive font-medium border border-destructive/20">
          Error: {(error as Error).message}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          pageIndex={1}
          pageSize={data?.data?.length || 10}
          totalCount={data?.data?.length || 0}
          onPageChange={() => {}}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
