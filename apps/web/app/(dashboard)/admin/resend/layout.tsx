"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { APP_ROUTES } from "@/lib/constants";

export default function ResendLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.includes("received")) return APP_ROUTES.ADMIN.RESEND.RECEIVED;
    if (pathname.includes("emails")) return APP_ROUTES.ADMIN.RESEND.EMAILS;
    if (pathname.includes("webhooks")) return APP_ROUTES.ADMIN.RESEND.WEBHOOKS;
    return APP_ROUTES.ADMIN.RESEND.EMAILS;
  };

  return (
    <div className="space-y-6">
      <Tabs value={getActiveTab()} className="w-full h-full">
        <TabsList>
          <TabsTrigger value={APP_ROUTES.ADMIN.RESEND.EMAILS} asChild>
            <Link href={APP_ROUTES.ADMIN.RESEND.EMAILS}>Sending (Outbox)</Link>
          </TabsTrigger>
          <TabsTrigger value={APP_ROUTES.ADMIN.RESEND.RECEIVED} asChild>
            <Link href={APP_ROUTES.ADMIN.RESEND.RECEIVED}>Receiving (Inbox)</Link>
          </TabsTrigger>
          <TabsTrigger value={APP_ROUTES.ADMIN.RESEND.WEBHOOKS} asChild>
            <Link href={APP_ROUTES.ADMIN.RESEND.WEBHOOKS}>Webhooks</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
