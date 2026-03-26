"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher";
import { cn } from "@workspace/ui/lib/utils";

type Message = {
  id: string;
  content: string;
  senderRole: string;
  createdAt: string;
};

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history if user provides email
  const fetchHistory = async (email: string) => {
    try {
      const res = await fetch(`/api/contacts/messages?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subscribe to real-time replies
  useEffect(() => {
    if (!form.email || !form.email.includes("@")) return;

    const channelName = `conversation-${form.email.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "")}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => {
        // Prevent duplicates if possible
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [form.email]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/contacts/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Failed to send message");

      toast.success("Message sent!");
      setForm({ ...form, message: "" }); // Only clear message
      fetchHistory(form.email);
    } catch (error) {
      toast.error("Something went wrong.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
      <Card className="shadow-xl border-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Contact Us</CardTitle>
          <CardDescription>
            Ask us anything. We usually reply in real-time!
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input 
                id="c-name" 
                placeholder="Your Name" 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input 
                id="c-email" 
                type="email" 
                placeholder="your@email.com" 
                value={form.email}
                onBlur={() => form.email && fetchHistory(form.email)}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-message">Message</Label>
              <Textarea 
                id="c-message" 
                placeholder="How can we help?" 
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Message
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-xl border-primary/10 flex flex-col h-[500px] lg:h-full bg-muted/5">
        <CardHeader className="border-b bg-card">
           <CardTitle className="text-lg flex items-center gap-2">
             <MessageCircle className="h-5 w-5 text-primary" />
             Live Support
           </CardTitle>
           <CardDescription>Messages from our team appear here.</CardDescription>
        </CardHeader>
        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
           {messages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                <MessageCircle className="h-12 w-12" />
                <p className="text-sm font-medium">No messages yet</p>
             </div>
           ) : (
             messages.map((msg, i) => {
               const isAdmin = msg.senderRole === "admin";
               return (
                 <div key={msg.id || i} className={cn(
                   "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-1",
                   isAdmin ? "mr-auto items-start" : "ml-auto items-end"
                 )}>
                   <div className={cn(
                     "px-3 py-1.5 rounded-xl text-sm shadow-sm",
                     isAdmin ? "bg-primary text-primary-foreground rounded-tl-none" : "bg-card border rounded-tr-none"
                   )}>
                      {msg.content}
                   </div>
                   <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {isAdmin ? "Admin" : "You"} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                 </div>
               );
             })
           )}
        </CardContent>
      </Card>
    </div>
  );
}
