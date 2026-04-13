"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { PasswordInput } from "@workspace/ui/components/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { AlertCircle, CheckCircle2, Server, Database as DbIcon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";

export const databaseTypes = [
  { id: "MYSQL", name: "MySQL", icon: Server },
  { id: "TIDB", name: "TiDB", icon: Server },
  { id: "SUPABASE", name: "Supabase (PostgreSQL)", icon: ShieldCheck },
  { id: "POSTGRESQL", name: "PostgreSQL", icon: Server },
  { id: "COUCHBASE", name: "Couchbase", icon: DbIcon },
  { id: "YUGABYTE", name: "YugabyteDB", icon: Server },
] as const;

const backupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  databaseType: z.enum(["MYSQL", "TIDB", "SUPABASE", "POSTGRESQL", "COUCHBASE", "YUGABYTE"]),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().int().positive("Port must be a positive integer"),
  databaseName: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  options: z.string().optional(),
});

export type BackupFormValues = z.infer<typeof backupSchema>;

interface BackupFormProps {
  initialData?: any;
  onSubmit: (values: BackupFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function BackupForm({ initialData, onSubmit, isLoading }: BackupFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const form = useForm<BackupFormValues>({
    resolver: zodResolver(backupSchema),
    defaultValues: {
      name: initialData?.name || "",
      databaseType: initialData?.databaseType || "MYSQL",
      host: initialData?.host || "",
      port: initialData?.port || 3306,
      databaseName: initialData?.databaseName || "",
      username: initialData?.username || "",
      password: initialData?.password || "",
      options: initialData?.options ? JSON.stringify(initialData.options, null, 2) : "",
    },
  });

  const selectedType = form.watch("databaseType");

  // Update default port based on type
  const handleTypeChange = (type: string) => {
    form.setValue("databaseType", type as any);
    if (type === "MYSQL" || type === "TIDB") form.setValue("port", 3306);
    if (type === "POSTGRESQL" || type === "SUPABASE" || type === "YUGABYTE") form.setValue("port", 5432);
    if (type === "COUCHBASE") form.setValue("port", 8091);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setSuccess(false);
          try {
            // Parse options if present
            let parsedOptions = null;
            if (values.options) {
              try {
                parsedOptions = JSON.parse(values.options);
              } catch (e) {
                throw new Error("Invalid JSON in Options field");
              }
            }
            
            await onSubmit({ ...values, options: parsedOptions });
            setSuccess(true);
            toast.success(initialData ? "Configuration updated" : "Configuration created", {
              description: `Database ${values.name} has been ${initialData ? "updated" : "saved"}.`,
            });
          } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
            toast.error("Operation failed", {
              description: err.message || "An unexpected error occurred.",
            });
          }
        })} 
        className="space-y-6"
      >
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {initialData ? "Configuration has been updated." : "Configuration has been created."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production DB Backup" {...field} />
                      </FormControl>
                      <FormDescription>A friendly name for this backup configuration.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="databaseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database Type</FormLabel>
                      <Select 
                        onValueChange={(val) => handleTypeChange(val)} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select database type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {databaseTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host / Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="databaseName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{selectedType === "COUCHBASE" ? "Bucket Name" : "Database Name"}</FormLabel>
                <FormControl>
                  <Input placeholder={selectedType === "COUCHBASE" ? "default" : "my_database"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="root" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="options"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Extra Options (JSON)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='{ "ssl": true }' 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>Additional connection options in JSON format.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update Configuration" : "Save Configuration"}
        </Button>
      </form>
    </Form>
  );
}
