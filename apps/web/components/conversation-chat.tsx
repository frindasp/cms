"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { MessageSquare, Send, Loader2, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { pusherClient } from "@/lib/pusher";

type Message = {
  id: string;
  content: string;
  senderId: string;
  senderRole?: "user" | "admin";
  createdAt: string;
  sender: {
    name: string | null;
  };
};

type ThreadSource = "message" | "contact";

type Thread = {
  email: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  source: ThreadSource;
};

export default function ConversationChat() {
  const { status } = useSession();
  const [messageThreads, setMessageThreads] = useState<Thread[]>([]);
  const [contactThreads, setContactThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [activeTab, setActiveTab] = useState<ThreadSource>("contact");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
    const notificationChannel = pusherClient.subscribe("admin-notifications");
    notificationChannel.bind("new-contact", () => {
      fetchThreads();
    });

    return () => {
      pusherClient.unsubscribe("admin-notifications");
    };
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/contacts/conversations");
      if (res.ok) {
        const json = await res.json();
        const grouped = json.data ?? {};
        const nextMessageThreads: Thread[] = grouped.messageThreads ?? [];
        const nextContactThreads: Thread[] = grouped.contactThreads ?? [];

        setMessageThreads(nextMessageThreads);
        setContactThreads(nextContactThreads);
        setActiveTab((prev) => {
          if (prev === "message" && nextMessageThreads.length === 0 && nextContactThreads.length > 0) return "contact";
          if (prev === "contact" && nextContactThreads.length === 0 && nextMessageThreads.length > 0) return "message";
          return prev;
        });
        setSelectedThread((prev) => {
          if (prev) {
            const stillExists =
              nextMessageThreads.find((thread) => thread.email === prev.email && thread.source === prev.source) ??
              nextContactThreads.find((thread) => thread.email === prev.email && thread.source === prev.source);
            if (stillExists) return stillExists;
          }

          return nextContactThreads[0] ?? nextMessageThreads[0] ?? null;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/contacts/messages?channelId=${encodeURIComponent(channelId)}`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedThread) return;

    fetchMessages(selectedThread.email);

    const channelName = `conversation-${selectedThread.email.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "")}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [selectedThread]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedThread || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/contacts/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedThread.email, content: input }),
      });

      if (res.ok) {
        setInput("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderThreads = (threads: Thread[]) => {
    if (loadingThreads) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 opacity-30" /></div>;
    }

    if (threads.length === 0) {
      return <div className="p-8 text-center text-muted-foreground text-sm">No conversations found.</div>;
    }

    return threads.map((thread) => (
      <button
        key={`${thread.source}-${thread.email}`}
        onClick={() => {
          setSelectedThread(thread);
          setActiveTab(thread.source);
        }}
        className={cn(
          "w-full text-left p-4 flex gap-3 transition-all hover:bg-primary/5 border-b border-primary/5",
          selectedThread?.email === thread.email && selectedThread?.source === thread.source && "bg-primary/10 border-l-4 border-l-primary"
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary">{thread.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold truncate">{thread.name}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
              {new Date(thread.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate opacity-70 mt-1">{thread.lastMessage}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {thread.messageCount} msgs
            </span>
            {thread.source === "contact" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                from contacts
              </span>
            )}
          </div>
        </div>
      </button>
    ));
  };

  if (status === "loading") return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[700px] w-full gap-4 max-w-6xl mx-auto">
      <Card className="w-full lg:w-80 flex flex-col border-primary/20 bg-background/50 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Conversations</CardTitle>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search user..." className="pl-9 h-9 text-sm rounded-xl bg-primary/5" />
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ThreadSource)}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="message">Messages</TabsTrigger>
              <TabsTrigger value="contact">Contacts</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          <Tabs value={activeTab}>
            <TabsContent value="message" className="m-0">{renderThreads(messageThreads)}</TabsContent>
            <TabsContent value="contact" className="m-0">{renderThreads(contactThreads)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col border-primary/20 bg-background/50 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        {selectedThread ? (
          <>
            <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary">{selectedThread.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base flex items-center gap-2">{selectedThread.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedThread.email}</p>
              </div>
            </CardHeader>
            <CardContent
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-primary/5"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === "admin";
                  return (
                    <div
                      key={msg.id || idx}
                      className={cn(
                        "flex flex-col max-w-[85%] transition-all animate-in fade-in slide-in-from-bottom-1",
                        isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn("px-4 py-2 rounded-2xl shadow-sm", isAdmin ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none")}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 opacity-60">
                        {isAdmin ? "You" : (msg.sender.name || "User")} • {new Date(msg.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
            <CardFooter className="p-4 border-t bg-card/50">
              <form onSubmit={sendReply} className="flex w-full gap-2">
                <Input
                  placeholder="Reply to user..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1 rounded-full px-5 h-11 border-primary/20 focus-visible:ring-primary bg-background/80"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="rounded-full h-11 w-11 p-0"
                  size="icon"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-4">
            <MessageSquare className="h-16 w-16" />
            <p className="text-lg font-medium">Select a conversation to start reading</p>
          </div>
        )}
      </Card>
    </div>
  );
}
