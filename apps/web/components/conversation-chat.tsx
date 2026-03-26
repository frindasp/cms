"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { MessageSquare, Send, User as UserIcon, Loader2, Search } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { pusherClient } from "@/lib/pusher";

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    name: string | null;
  };
};

type Thread = {
  email: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
};

export default function ConversationChat() {
  const { data: session, status } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch threads initially
  useEffect(() => {
    fetchThreads();
    const notificationChannel = pusherClient.subscribe("admin-notifications");
    notificationChannel.bind("new-contact", () => {
      fetchThreads(); // Refresh threads when a new contact comes in
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
        setThreads(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (email: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/contacts/messages?email=${encodeURIComponent(email)}`);
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

  // Subscribe to selected conversation
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

  // Scroll to bottom
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
        body: JSON.stringify({ email: selectedThread!.email, content: input }),
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

  if (status === "loading") return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[700px] w-full gap-4 max-w-6xl mx-auto">
      {/* Sidebar: Thread List */}
      <Card className="w-full lg:w-80 flex flex-col border-primary/20 bg-background/50 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
             <MessageSquare className="h-5 w-5 text-primary" />
             <CardTitle className="text-lg">Conversations</CardTitle>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input placeholder="Search user..." className="pl-9 h-9 text-sm rounded-xl bg-primary/5" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 opacity-30" /></div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No messages found.</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.email}
                onClick={() => setSelectedThread(thread)}
                className={cn(
                  "w-full text-left p-4 flex gap-3 transition-all hover:bg-primary/5 border-b border-primary/5",
                  selectedThread?.email === thread.email && "bg-primary/10 border-l-4 border-l-primary"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary">{thread.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold truncate">{thread.name}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                       {new Date(thread.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate opacity-70 mt-1">{thread.lastMessage}</p>
                  <div className="flex items-center mt-1">
                     <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {thread.messageCount} msgs
                     </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main: Chat Messages */}
      <Card className="flex-1 flex flex-col border-primary/20 bg-background/50 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        {selectedThread ? (
          <>
            <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
               <Avatar className="h-10 w-10">
                 <AvatarFallback className="bg-primary/20 text-primary">{selectedThread.name?.[0] || 'U'}</AvatarFallback>
               </Avatar>
               <div>
                 <CardTitle className="text-base flex items-center gap-2">
                    {selectedThread.name}
                 </CardTitle>
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
                  const isAdmin = (msg as any).senderRole === "admin";
                  return (
                    <div 
                      key={msg.id || idx} 
                      className={cn(
                        "flex flex-col max-w-[85%] transition-all animate-in fade-in slide-in-from-bottom-1",
                        isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2 rounded-2xl shadow-sm",
                        isAdmin 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-card border rounded-tl-none"
                      )}>
                         <p className="text-sm">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 opacity-60">
                         {isAdmin ? "You" : (msg.sender.name || "User")} • {new Date(msg.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
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
