"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BackupForm, BackupFormValues } from "@/components/backup-form";
import { APP_ROUTES, API_ROUTES } from "@/lib/constants";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

export default function BackupEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: config, isLoading: isFetching } = useQuery({
    queryKey: ["backup-config", id],
    queryFn: async () => {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const onSubmit = async (values: BackupFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_ROUTES.BACKUP}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update configuration");
      }

      router.push(APP_ROUTES.ADMIN.BACKUP.INDEX);
      router.refresh();
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) return <div className="p-8">Loading configuration...</div>;
  if (!config) return <div className="p-8">Configuration not found</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Backup Configuration</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{config.name}</CardTitle>
            <CardDescription>
              Update the connection details for your database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BackupForm 
              initialData={config} 
              onSubmit={onSubmit} 
              isLoading={isSubmitting} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
