"use client";

import { useState, useEffect } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { MapPin, Mail, Loader2, Save, CheckCircle } from "lucide-react";

interface AboutData {
  id: string;
  content: string;
  email: string;
  location: string;
}

export default function AboutAdminPage() {
  const [about, setAbout] = useState<AboutData | null>(null);
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("Jakarta, Indonesia");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/about")
      .then((r) => r.json())
      .then((data: AboutData) => {
        if (data) {
          setAbout(data);
          setContent(data.content ?? "");
          setEmail(data.email ?? "");
          setLocation(data.location ?? "Jakarta, Indonesia");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, email, location }),
      });
      if (res.ok) {
        const data = await res.json();
        setAbout(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">About Page</h1>
        <p className="text-muted-foreground mt-1">
          Manage the content displayed on the portfolio About page.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Location</CardTitle>
            <CardDescription>
              Public email and location shown on the About page header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Public Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                This email appears as a clickable mailto link on the portfolio.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </CardContent>
        </Card>

        {/* WYSIWYG Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bio / About Content</CardTitle>
            <CardDescription>
              Rich text content displayed in the About section. Supports formatting, lists, and links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your bio here..."
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
