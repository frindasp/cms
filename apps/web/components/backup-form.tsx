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
import { AlertCircle, CheckCircle2, Server, Database as DbIcon, ShieldCheck, Leaf } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";

export const databaseTypes = [
  { id: "MYSQL", name: "MySQL", icon: Server },
  { id: "TIDB", name: "TiDB", icon: Server },
  { id: "SUPABASE", name: "Supabase (PostgreSQL)", icon: ShieldCheck },
  { id: "POSTGRESQL", name: "PostgreSQL", icon: Server },
  { id: "COUCHBASE", name: "Couchbase", icon: DbIcon },
  { id: "YUGABYTE", name: "YugabyteDB", icon: Server },
  { id: "MONGODB", name: "MongoDB", icon: Leaf },
  { id: "YSQL", name: "YugabyteDB (YSQL)", icon: Server },
  { id: "YCQL", name: "YugabyteDB (YCQL)", icon: DbIcon },
  { id: "MONGODB_JDBC", name: "MongoDB (JDBC Style)", icon: Leaf },
] as const;

export const backupPresets = [
  {
    name: "Couchbase Cloud Production",
    databaseType: "COUCHBASE" as const,
    host: "cb.8okbvrgff1vjbwal.cloud.couchbase.com",
    port: 8091,
    databaseName: "default",
    username: "frindasp",
    password: "4!eZnVq4+vw!",
    options: JSON.stringify({
      configProfile: "wanDevelopment",
      protocol: "couchbases"
    }, null, 2),
  },
  {
    name: "YugabyteDB (YSQL)",
    databaseType: "YSQL" as const,
    host: "ap-southeast-3.b0ecb2da-7903-49c0-b31d-2862edf7eb05.aws.yugabyte.cloud",
    port: 5433,
    databaseName: "yugabyte",
    username: "admin",
    password: "KnKeoNqW-0VXQ0sVc1dTMPBMuBvQJN",
    options: JSON.stringify({
      ssl: {
        rejectUnauthorized: true,
        ca: "cred/root.crt"
      }
    }, null, 2),
  },
  {
    name: "YugabyteDB (YCQL)",
    databaseType: "YCQL" as const,
    host: "ap-southeast-3.b0ecb2da-7903-49c0-b31d-2862edf7eb05.aws.yugabyte.cloud",
    port: 9042,
    databaseName: "yugabyte",
    username: "admin",
    password: "KnKeoNqW-0VXQ0sVc1dTMPBMuBvQJN",
    options: JSON.stringify({
      ssl: {
        rejectUnauthorized: true,
        ca: "cred/root.crt"
      }
    }, null, 2),
  },
  {
    name: "TiDB Cloud Production",
    databaseType: "TIDB" as const,
    host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    port: 3306,
    databaseName: "frindasp",
    username: "2puzcssyZR699bw.root",
    password: "ghAYdJJAIg3bzcYg",
    options: JSON.stringify({
      ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true
      }
    }, null, 2),
  },
  {
    name: "MongoDB Atlas (SRV)",
    databaseType: "MONGODB" as const,
    host: "mongodb+srv://frindasp.zjtcpif.mongodb.net",
    port: 27017,
    databaseName: "frindasp",
    username: "frindasp_db_user",
    password: "Fm9lo6cXLX38V9HK",
    options: JSON.stringify({
      appName: "frindasp"
    }, null, 2),
  },
  {
    name: "MongoDB Atlas (Standard)",
    databaseType: "MONGODB" as const,
    host: "ac-kdwlelp-shard-00-00.zjtcpif.mongodb.net:27017,ac-kdwlelp-shard-00-01.zjtcpif.mongodb.net:27017,ac-kdwlelp-shard-00-02.zjtcpif.mongodb.net:27017/?ssl=true&replicaSet=atlas-3gfccp-shard-0&authSource=admin",
    port: 27017,
    databaseName: "frindasp",
    username: "frindasp_db_user",
    password: "Fm9lo6cXLX38V9HK",
    options: JSON.stringify({
      appName: "frindasp",
    }, null, 2),
  },
  {
    name: "MongoDB Atlas (JDBC Style)",
    databaseType: "MONGODB_JDBC" as const,
    host: "jdbc:mongodb://atlas-sql-69ddf1530a813c9f76a32706-ud7ibh.g.query.mongodb.net/sample_mflix?ssl=true&authSource=admin",
    port: 27017,
    databaseName: "sample_mflix",
    username: "frindasp_db_user",
    password: "Fm9lo6cXLX38V9HK",
    options: JSON.stringify({
      appName: "frindasp",
    }, null, 2),
  }
];



const backupSchema = z.object({

  name: z.string().min(2, "Name must be at least 2 characters"),
  databaseType: z.enum(["MYSQL", "TIDB", "SUPABASE", "POSTGRESQL", "COUCHBASE", "YUGABYTE", "MONGODB", "YSQL", "YCQL", "MONGODB_JDBC"]),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().int().positive("Port must be a positive integer"),
  databaseName: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  options: z.string().optional(),
});

export type BackupFormValues = z.infer<typeof backupSchema>;
export type BackupSubmitValues = Omit<BackupFormValues, "options"> & { options?: unknown };

interface BackupFormProps {
  initialData?: any;
  onSubmit: (values: BackupSubmitValues) => Promise<void>;
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

  const [isTesting, setIsTesting] = useState(false);

  const onTestConnection = async () => {
    setIsTesting(true);
    const values = form.getValues();
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

      const res = await fetch("/api/backup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, options: parsedOptions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      toast.success("Connection test successful!", {
        description: `Successfully connected to ${values.databaseType} server.`,
      });
    } catch (err: any) {
      toast.error("Connection test failed", {
        description: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const selectedType = form.watch("databaseType");


  // Update default port based on type
  const handleTypeChange = (type: string) => {
    form.setValue("databaseType", type as any);
    if (type === "MYSQL" || type === "TIDB") form.setValue("port", 3306);
    if (type === "POSTGRESQL" || type === "SUPABASE" || type === "YUGABYTE") form.setValue("port", 5432);
    if (type === "COUCHBASE") form.setValue("port", 8091);
    if (type === "MONGODB") form.setValue("port", 27017);
    if (type === "YSQL") form.setValue("port", 5433);
    if (type === "YCQL") form.setValue("port", 9042);
    if (type === "MONGODB_JDBC") form.setValue("port", 27017);
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

        {!initialData && (
          <div className="space-y-2">
            <FormLabel>Fill from Template</FormLabel>
            <div className="flex flex-wrap gap-2">
              {backupPresets.map((preset) => (
                <Button
                  key={preset.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.reset(preset);
                    toast.info(`Filled with ${preset.name} template`);
                  }}
                >
                  <DbIcon className="mr-2 h-4 w-4" />
                  {preset.name}
                </Button>
              ))}
            </div>
            <FormDescription>Choose a pre-defined template to quickly fill the form.</FormDescription>
          </div>
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
                        value={field.value}
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

        <div className="flex gap-4">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1" 
            onClick={onTestConnection}
            disabled={isTesting || isLoading}
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading || isTesting}>
            {isLoading ? "Saving..." : initialData ? "Update Configuration" : "Save Configuration"}
          </Button>
        </div>
      </form>

    </Form>
  );
}
