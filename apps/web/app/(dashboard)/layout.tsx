import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider className="h-dvh max-h-dvh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-dvh max-h-dvh flex flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 font-medium">
            Admin Panel
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto p-3 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
