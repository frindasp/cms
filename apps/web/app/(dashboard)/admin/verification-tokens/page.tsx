"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal, Trash } from "lucide-react";
import { API_ROUTES } from "@/lib/constants";
import { Badge } from "@workspace/ui/components/badge";

type VerificationToken = {
  id: string;
  email: string;
  token: string;
  expires: string;
  createdAt: string;
};

export default function VerificationTokensPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["verification-tokens", page],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.VERIFICATION_TOKENS}?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_ROUTES.VERIFICATION_TOKENS}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-tokens"] });
    },
  });

  const columns: ColumnDef<VerificationToken>[] = [
    {
      id: "actions",
      cell: ({ row }) => {
        const token = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this token?")) {
                    deleteMutation.mutate(token.id);
                  }
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "token",
      header: "Verification Code",
      cell: ({ row }) => (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono tracking-wider">
          {row.getValue("token")}
        </code>
      ),
    },
    {
      accessorKey: "expires",
      header: "Expires At",
      cell: ({ row }) => {
        const expires = new Date(row.getValue("expires"));
        const isExpired = expires < new Date();
        return (
          <div className="flex flex-col gap-1">
            <span>{expires.toLocaleString()}</span>
            {isExpired && (
              <Badge variant="destructive" className="w-fit text-[10px] h-4">
                Expired
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Kode Verifikasi</h1>
          <p className="text-muted-foreground">
            Manage verification tokens used for authentication and password resets.
          </p>
        </div>
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
