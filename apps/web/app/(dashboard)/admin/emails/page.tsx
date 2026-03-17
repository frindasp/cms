"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";

type WebhookEmail = {
  id: string;
  from: string | null;
  to: string | null;
  subject: string | null;
  createdAt: string;
};

import { Button } from "@workspace/ui/components/button";
import { Eye } from "lucide-react";
import Link from "next/link";

const columns: ColumnDef<WebhookEmail>[] = [
  {
    accessorKey: "from",
    header: "From",
  },
  {
    accessorKey: "subject",
    header: "Subject",
  },
  {
    accessorKey: "createdAt",
    header: "Received At",
    cell: ({ row }) => {
      return new Date(row.getValue("createdAt")).toLocaleString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const email = row.original;
      return (
        <Link href={`/admin/emails/${email.id}`}>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      );
    },
  },
];

export default function EmailsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", page],
    queryFn: async () => {
      const res = await fetch(`/api/emails?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhook Emails</h1>
        <p className="text-muted-foreground">
          View all emails captured via incoming webhooks.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        pageIndex={page}
        pageSize={limit}
        totalCount={data?.total || 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
