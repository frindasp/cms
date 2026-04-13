import { Contact, Mail, Users, Webhook, Shield } from "lucide-react";

export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  ADMIN: {
    DASHBOARD: "/admin",
    ABOUT: "/admin/about",
    EXPERIENCES: "/admin/experiences",
    SKILLS: "/admin/skills",
    PORTFOLIOS: "/admin/portfolios",
    USERS: "/admin/users",
    ROLES: "/admin/roles",
    MESSAGES: "/admin/messages",
    CONTACTS: "/admin/contacts",
    RESEND: {
      EMAILS: "/admin/resend/emails",
      WEBHOOKS: "/admin/resend/webhooks",
      RECEIVED: "/admin/resend/received",
    },
    VERIFICATION_TOKENS: "/admin/verification-tokens",
    ACTIVITY: "/admin/activity",
    CHAT: "/admin/chat",
    BACKUP: {
      INDEX: "/admin/backup",
      CREATE: "/admin/backup/create",
      DETAIL: "/admin/backup/[id]",
      EDIT: "/admin/backup/[id]/edit",
    },
  },
};

export const API_ROUTES = {
  USERS: "/api/users",
  ROLES: "/api/roles",
  MESSAGES: "/api/messages",
  CONTACTS: "/api/contacts",
  ABOUT: "/api/about",
  EXPERIENCES: "/api/experiences",
  SKILLS: "/api/skills",
  PORTFOLIOS: "/api/portfolios",
  UPLOAD: "/api/upload",
  RESEND: {
    EMAILS: "/api/resend/emails",
    WEBHOOKS: "/api/resend/webhooks",
    RECEIVED: "/api/resend/received",
  },
  VERIFICATION_TOKENS: "/api/verification-tokens",
  ACTIVITY: "/api/activities",
  BACKUP: "/api/backup",
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
    id: "received",
    title: "Received Emails",
    icon: Mail,
    description: "Emails captured via webhooks",
    href: APP_ROUTES.ADMIN.RESEND.RECEIVED,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: "emails",
    title: "Sent Emails",
    icon: Mail,
    description: "Emails sent via Resend API",
    href: APP_ROUTES.ADMIN.RESEND.EMAILS,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
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
  {
    id: "webhooks",
    title: "Resend Webhooks",
    icon: Webhook,
    description: "Configured Resend Webhooks",
    href: APP_ROUTES.ADMIN.RESEND.WEBHOOKS,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    id: "tokens",
    title: "Verification Tokens",
    icon: Shield,
    description: "Active verification codes",
    href: APP_ROUTES.ADMIN.VERIFICATION_TOKENS,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];
