"use client";

import { UserActivityTable } from "@/components/user-activity-table";

export default function GlobalActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Activity</h1>
        <p className="text-muted-foreground">
          View all administrator activities across the platform.
        </p>
      </div>

      <div className="rounded-md border bg-card p-6">
        <UserActivityTable pageSize={20} />
      </div>
    </div>
  );
}
