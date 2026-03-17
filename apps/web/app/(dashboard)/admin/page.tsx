import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { prisma } from "@workspace/database";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DASHBOARD_STATS } from "@/lib/constants";
import { Resend } from "resend";

export default async function AdminPage() {
  const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
  
  const [contactsCount, emailsCount, usersCount, webhooksRes] = await Promise.all([
    prisma.contact.count(),
    prisma.webhookEmail.count(),
    prisma.user.count(),
    process.env.RESEND_API_KEY ? resend.webhooks.list() : Promise.resolve({ data: [] }),
  ]);

  const stats = DASHBOARD_STATS.map((stat) => ({
    ...stat,
    value: 
      stat.id === "contacts" ? contactsCount :
      stat.id === "emails" ? emailsCount :
      stat.id === "webhooks" ? ((webhooksRes.data as any)?.data?.length || 0) :
      usersCount,
  }));

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Welcome to your CMS administration panel. Manage your content and users efficiently.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group outline-none">
            <Card className="relative overflow-hidden border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
              <div className={`absolute top-0 right-0 p-3 opacity-10 transition-transform duration-500 group-hover:scale-150 group-hover:rotate-12`}>
                <stat.icon className="h-12 w-12" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-full p-2 ${stat.bg} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {stat.description}
                </p>
                <div className="flex items-center gap-1 pt-2 text-xs font-medium text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  View details <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
