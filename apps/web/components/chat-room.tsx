"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Send, User as UserIcon, Loader2 } from "lucide-react";
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

export default function ChatRoom() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial connection to Pusher is handled by the pusherClient imported from lib
    const channel = pusherClient.subscribe("chat-room");

    setConnected(true); // Simplified: Assume client-side Pusher handles connection states

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Cleanup on unmount
    return () => {
      pusherClient.unsubscribe("chat-room");
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session?.user || loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: input,
          channel: "chat-room",
        }),
      });

      if (!response.ok) {
        console.error("Failed to send message");
      } else {
        setInput("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Card className="max-w-md mx-auto mt-12 overflow-hidden shadow-2xl border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Real-time Chat</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to join the conversation.</p>
          <Button asChild className="w-full">
            <a href="/login">Login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-4xl mx-auto shadow-2xl border-primary/20 bg-background/80 backdrop-blur-lg mt-8 overflow-hidden rounded-2xl">
      <CardHeader className="border-b bg-primary/5 backdrop-blur-xl py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={`https://avatar.vercel.sh/${session?.user?.id}`} />
              <AvatarFallback><UserIcon /></AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
              connected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
          </div>
          <div>
            <CardTitle className="text-lg">Public Chat</CardTitle>
            <p className="text-xs text-muted-foreground ml-1">
              Real-time powered by Pusher
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent 
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth bg-gradient-to-b from-transparent to-primary/5"
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col opacity-50 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
               <Send className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === (session?.user as any).id;
            return (
              <div 
                key={msg.id || i} 
                className={cn(
                  "flex flex-col max-w-[80%] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                  msg.senderId === "system" ? "mx-auto items-center w-full" : (isMe ? "ml-auto items-end" : "mr-auto items-start")
                )}
              >
                {msg.senderId !== "system" && !isMe && (
                   <span className="text-xs font-semibold mb-1 ml-1 text-primary/80">
                      {msg.sender.name || "User"}
                   </span>
                )}
                <div 
                  className={cn(
                    "px-4 py-2 rounded-2xl shadow-sm",
                    msg.senderId === "system" 
                      ? "bg-muted text-muted-foreground border-dashed border-2 text-xs italic"
                      : (isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-card border rounded-tl-none")
                  )}
                >
                  <p className={msg.senderId === "system" ? "text-center" : "text-sm"}>{msg.content}</p>
                </div>
                {msg.senderId !== "system" && (
                  <span className="text-[10px] text-muted-foreground mt-1 opacity-70">
                     {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="p-4 border-t bg-card/40 backdrop-blur-md">
        <form onSubmit={sendMessage} className="flex w-full gap-2 relative">
          <Input 
            placeholder="Type your message..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!connected || loading}
            className="flex-1 rounded-full px-5 h-12 border-primary/20 focus-visible:ring-primary shadow-inner bg-background/50 backdrop-blur-sm"
          />
          <Button 
            type="submit" 
            disabled={!connected || !input.trim() || loading}
            className="rounded-full h-12 w-12 p-0 transition-all duration-300 hover:scale-105 active:scale-95"
            size="icon"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
