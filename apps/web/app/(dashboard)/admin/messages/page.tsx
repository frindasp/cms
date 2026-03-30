"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MessageSquare } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { DataTable } from "@/components/data-table";

type Message = {
  id: string;
  content: string;
  senderId: string | null;
  senderEmail: string | null;
  isAdmin: boolean;
  createdAt: string;
  user?: { name: string | null };
  contact?: { name: string | null };
};

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["messages", page],
    queryFn: async () => {
      const res = await fetch(`/api/messages?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const columns: ColumnDef<Message>[] = [
    {
      accessorKey: "content",
      header: "Message",
      cell: ({ row }) => (
        <p className="max-w-md truncate" title={row.original.content}>
          {row.original.content}
        </p>
      ),
    },
    {
      header: "Sender",
      cell: ({ row }) => {
        const m = row.original;
        return m.user?.name || m.contact?.name || m.senderEmail || "System";
      },
    },
    {
      accessorKey: "isAdmin",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.isAdmin ? "default" : "outline"}>
          {row.original.isAdmin ? "admin" : "user"}
        </Badge>
      ),
    },
    {
      accessorKey: "senderEmail",
      header: "Channel/Email",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-7 w-7" />
          Messages
        </h1>
        <p className="text-muted-foreground">
          Semua message yang masuk ditampilkan di sini.
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
