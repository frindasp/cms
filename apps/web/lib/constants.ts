import { Contact, Mail, Users } from "lucide-react";

export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  ADMIN: {
    DASHBOARD: "/admin",
    USERS: "/admin/users",
    CONTACTS: "/admin/contacts",
    EMAILS: "/admin/emails",
  },
};

export const API_ROUTES = {
  USERS: "/api/users",
  ROLES: "/api/roles",
  CONTACTS: "/api/contacts",
  EMAILS: "/api/emails",
};

export const DASHBOARD_STATS = [
  {
    id: "contacts",
    title: "Total Contacts",
    icon: Contact,
    description: "Inquiries from contact form",
    href: APP_ROUTES.ADMIN.CONTACTS,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: "emails",
    title: "Webhook Emails",
    icon: Mail,
    description: "Emails captured via webhooks",
    href: APP_ROUTES.ADMIN.EMAILS,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "users",
    title: "Admin Users",
    icon: Users,
    description: "Active administrator accounts",
    href: APP_ROUTES.ADMIN.USERS,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];
