"use client";

import { usePathname } from "next/navigation";
import { Card } from "@workspace/ui/components/card";

/** Wraps non-chat dashboard pages in a single internally scrollable Card. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/chat") {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <Card className="flex-1 min-h-0 gap-0 py-0 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        {children}
      </div>
    </Card>
  );
}
