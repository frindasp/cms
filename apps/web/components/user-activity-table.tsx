"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTable } from "./data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

type Activity = {
  id: string;
  userId: string | null;
  action: string;
  description: string | null;
  route: string | null;
  method: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  userAgent: string | null;
  createdAt: string;
  User: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

interface UserActivityTableProps {
  userId?: string;
  pageSize?: number;
  scrollToId?: string | null;
}

export function UserActivityTable({ userId, pageSize = 10, scrollToId }: UserActivityTableProps) {
  const [pageIndex, setPageIndex] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["activities", userId, pageIndex, pageSize],
    queryFn: async () => {
      const url = new URL("/api/activities", window.location.origin);
      if (userId) url.searchParams.set("userId", userId);
      url.searchParams.set("page", pageIndex.toString());
      url.searchParams.set("limit", pageSize.toString());
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  useEffect(() => {
    if (scrollToId && data?.data) {
      const element = document.getElementById(`row-${scrollToId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-muted");
        setTimeout(() => element.classList.remove("bg-muted"), 3000);
      }
    }
  }, [scrollToId, data]);

  const columns: ColumnDef<Activity>[] = [
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.createdAt))} ago
          </span>
        </div>
      ),
    },
    {
      accessorKey: "User",
      header: "User",
      cell: ({ row }) => {
        const user = row.original.User;
        if (!user) return <span className="text-muted-foreground">System</span>;
        return (
          <Link 
            href={`/admin/users/${user.id}`}
            className="text-primary hover:underline font-medium"
          >
            {user.name || user.email}
          </Link>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(
          "uppercase text-[10px]",
          row.original.action.includes("DELETE") && "border-destructive text-destructive"
        )}>
          {row.original.action.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.description || "-"}</span>
      ),
    },
    {
      accessorKey: "details",
      header: "Device/IP",
      cell: ({ row }) => (
        <div className="flex flex-col text-[10px] text-muted-foreground">
          <span>{row.original.ipAddress}</span>
          <span className="capitalize">{row.original.deviceType}</span>
        </div>
      ),
    },
    {
      id: "view",
      cell: ({ row }) => (
        <Link 
          href={`/admin/users/${row.original.userId || ""}?activityId=${row.original.id}`}
          className="text-xs text-muted-foreground hover:text-primary underline"
        >
          View in Profile
        </Link>
      )
    }
  ];

  return (
    <div id="activity-table">
      <DataTable
        columns={columns}
        data={data?.data || []}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={data?.total || 0}
        onPageChange={setPageIndex}
        isLoading={isLoading}
      />
    </div>
  );
}
