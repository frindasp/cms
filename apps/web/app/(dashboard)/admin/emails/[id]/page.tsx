"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { ChevronLeft, Mail, Calendar, User, Users } from "lucide-react";
import { use } from "react";

export default function EmailDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const { id } = params;

  const { data: email, isLoading, error } = useQuery({
    queryKey: ["email", id],
    queryFn: async () => {
      const res = await fetch(`/api/emails/${id}`);
      if (!res.ok) throw new Error("Failed to fetch email");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading email details...</div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-destructive font-medium">Email not found or failed to load.</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Email Details</h1>
      </div>

      <Card className="border-none shadow-sm bg-linear-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {email.subject || "(No Subject)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">From:</span> {email.from}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-medium text-foreground">Received:</span> {new Date(email.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-full">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">To:</span> {email.to}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-active:border-primary px-6 py-3">
            Preview
          </TabsTrigger>
          <TabsTrigger value="html" className="rounded-none border-b-2 border-transparent data-active:border-primary px-6 py-3">
            HTML
          </TabsTrigger>
          <TabsTrigger value="text" className="rounded-none border-b-2 border-transparent data-active:border-primary px-6 py-3">
            Plain Text
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-sm">
          <CardContent className="p-0">
            <TabsContent value="preview" className="m-0 border rounded-lg overflow-hidden bg-white min-h-[500px]">
              {email.html ? (
                <iframe
                  srcDoc={email.html}
                  title="Email Preview"
                  className="w-full min-h-[600px] border-none"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No HTML content available for preview.
                </div>
              )}
            </TabsContent>

            <TabsContent value="html" className="m-0">
              <div className="relative p-4 bg-muted/30 rounded-lg overflow-hidden">
                <pre className="text-xs font-mono overflow-auto max-h-[600px] p-4 bg-background rounded border">
                  {email.html || "No HTML content."}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="text" className="m-0">
              <div className="p-6 bg-background rounded-lg border min-h-[300px] whitespace-pre-wrap text-sm leading-relaxed">
                {email.text || "No plain text content."}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
