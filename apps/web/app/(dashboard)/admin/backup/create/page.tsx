"use client";

import { useRouter } from "next/navigation";
import { BackupForm, BackupSubmitValues } from "@/components/backup-form";
import { APP_ROUTES, API_ROUTES } from "@/lib/constants";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

export default function BackupCreatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: BackupSubmitValues) => {
    setIsLoading(true);
    try {
      const res = await fetch(API_ROUTES.BACKUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create configuration");
      }

      router.push(APP_ROUTES.ADMIN.BACKUP.INDEX);
      router.refresh();
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Create Backup Configuration</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Configuration Details</CardTitle>
            <CardDescription>
              Enter the connection details for your database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BackupForm onSubmit={onSubmit} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
