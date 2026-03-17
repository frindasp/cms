import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { prisma } from "@workspace/database";
import { Contact, Mail, Users } from "lucide-react";

export default async function AdminPage() {
  const [contactsCount, emailsCount, usersCount] = await Promise.all([
    prisma.contact.count(),
    prisma.webhookEmail.count(),
    prisma.user.count(),
  ]);

  const stats = [
    {
      title: "Total Contacts",
      value: contactsCount,
      icon: Contact,
      description: "Inquiries from contact form",
    },
    {
      title: "Webhook Emails",
      value: emailsCount,
      icon: Mail,
      description: "Emails captured via webhooks",
    },
    {
      title: "Admin Users",
      value: usersCount,
      icon: Users,
      description: "Active administrator accounts",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome to your CMS administration panel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
