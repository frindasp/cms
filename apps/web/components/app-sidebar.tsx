"use client";

import {
  LayoutDashboard,
  Contact,
  Mail,
  User,
  LogOut,
  ChevronRight,
  Send,
  MessageSquare,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@workspace/ui/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { APP_ROUTES } from "@/lib/constants";

const items = [
  {
    title: "Dashboard",
    url: APP_ROUTES.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    title: "Real-time Live Chat",
    url: APP_ROUTES.ADMIN.LIVE_CHAT,
    icon: Send,
  },
  {
    title: "Contacts",
    url: APP_ROUTES.ADMIN.CONTACTS,
    icon: Contact,
  },
  {
    title: "Resend",
    url: APP_ROUTES.ADMIN.RESEND.EMAILS,
    icon: Mail,
  },
  {
    title: "Users",
    url: APP_ROUTES.ADMIN.USERS,
    icon: User,
  },
  {
    title: "Roles",
    url: APP_ROUTES.ADMIN.ROLES,
    icon: Shield,
  },
  {
    title: "Messages",
    url: APP_ROUTES.ADMIN.MESSAGES,
    icon: MessageSquare,
  },
  {
    title: "Verification Tokens",
    url: APP_ROUTES.ADMIN.VERIFICATION_TOKENS,
    icon: Shield,
  },
  {
    title: "User Activity",
    url: APP_ROUTES.ADMIN.ACTIVITY,
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            CMS
          </div>
          <span className="group-data-[collapsible=icon]:hidden">Frindasp</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.title === "Resend" 
                        ? pathname.startsWith("/admin/resend")
                        : pathname === item.url
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {session?.user?.name?.[0] || "U"}
              </div>
              <div className="flex flex-col items-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-semibold truncate w-32">
                  {session?.user?.name}
                </span>
                <span className="text-xs text-muted-foreground truncate w-32">
                  {session?.user?.email}
                </span>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
