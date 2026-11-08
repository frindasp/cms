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
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { AlertCircle, CheckCircle2, Upload, Loader2, User as UserIcon } from "lucide-react";
import { useState, useRef } from "react";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  roleId: z.string().min(1, "Please select a role"),
  avatarUrl: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: any;
  onSubmit: (values: UserFormValues) => void;
  isLoading?: boolean;
}

export function UserForm({ initialData, onSubmit, isLoading }: UserFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string>(
    initialData?.UserImage?.imageUrl || ""
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      return res.json();
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      password: "",
      roleId: initialData?.roleId || "",
      avatarUrl: initialData?.UserImage?.imageUrl || "",
    },
  });

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]!);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          folder: "/avatars",
        }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarPreview(data.url);
      form.setValue("avatarUrl", data.url);
      toast.success("Avatar image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setSuccess(false);
          try {
            await onSubmit(values);
            setSuccess(true);
            toast.success(initialData ? "User updated successfully" : "User created successfully", {
              description: initialData ? `${values.name}'s profile has been updated.` : `${values.name} has been added to the system.`,
            });
          } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
            toast.error("Operation failed", {
              description: err.message || "An unexpected error occurred.",
            });
          }
        })} 
        className="space-y-4"
      >
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {initialData ? "User has been updated." : "User has been created."}
            </AlertDescription>
          </Alert>
        )}

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarFile}
            accept="image/*"
            className="hidden"
          />
          <div className="relative h-14 w-14 rounded-full bg-muted border overflow-hidden flex items-center justify-center shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-6 w-6 text-muted-foreground" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold">Avatar Image (ImageKit)</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="h-8 text-xs"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload Foto
              </Button>
              {avatarPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAvatarPreview("");
                    form.setValue("avatarUrl", "");
                  }}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  Hapus
                </Button>
              )}
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} />
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
              <FormLabel>Password {initialData && "(Leave blank to keep current)"}</FormLabel>
              <FormControl>
                <PasswordInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update User" : "Create User"}
        </Button>
      </form>
    </Form>
  );
}
