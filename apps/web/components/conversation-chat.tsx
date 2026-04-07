"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { MessageSquare, Send, Loader2, Search, Edit2, Check, X, UserPlus, UserCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";

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

type ThreadSource = "message" | "contact" | "new-chat";

type Thread = {
  id: string;
  email: string;
  name: string;
  title: string | null;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  source: ThreadSource;
  contactId: string | null;
  roleId: string | null;
};

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  roleId: string;
  role: { name: string };
};

interface ConversationChatProps {
  defaultTab?: ThreadSource;
}

export default function ConversationChat({ defaultTab = "message" }: ConversationChatProps) {
  const { data: session, status } = useSession();
  const [messageThreads, setMessageThreads] = useState<Thread[]>([]);
  const [contactThreads, setContactThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [activeTab, setActiveTab] = useState<ThreadSource>(defaultTab === "new-chat" ? "new-chat" : "contact");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // New Chat states
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [newMsgContent, setNewMsgContent] = useState("");
  const [startingChat, setStartingChat] = useState(false);

  // Browser Title Notification
  useEffect(() => {
    const totalUnread = [...messageThreads, ...contactThreads].reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Inbox - Admin Dashboard`;
    } else {
      document.title = `Inbox - Admin Dashboard`;
    }
  }, [messageThreads, contactThreads]);

  useEffect(() => {
    fetchThreads();
    fetchUsers();

    const notificationChannel = pusherClient.subscribe("admin-notifications");
    notificationChannel.bind("new-contact", () => fetchThreads());
    notificationChannel.bind("new-message", () => fetchThreads());

    return () => {
      pusherClient.unsubscribe("admin-notifications");
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/contacts/conversations/${id}`, { method: "POST" });
      // Update local state immediately to subtract from unread
      setMessageThreads(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
      setContactThreads(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

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
        
        if (activeTab !== "new-chat") {
            setActiveTab((prev) => {
                if (prev === "message" && nextMessageThreads.length === 0 && nextContactThreads.length > 0) return "contact";
                if (prev === "contact" && nextContactThreads.length === 0 && nextMessageThreads.length > 0) return "message";
                return prev;
            });
        }

        setSelectedThread((prev) => {
          if (prev) {
            const stillExists =
              nextMessageThreads.find((thread) => thread.id === prev.id) ??
              nextContactThreads.find((thread) => thread.id === prev.id);
            if (stillExists) return stillExists;
          }
          return null;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (identifier: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/contacts/messages?id=${identifier}`);
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
    if (!selectedThread || activeTab === "new-chat") return;

    const identifier = selectedThread.id;
    fetchMessages(identifier);
    markAsRead(identifier); // Mark as read when opening

    const channelName = `conversation-${identifier}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      // If we are currently looking at this chat, mark it as read immediately
      markAsRead(identifier);
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [selectedThread?.id, activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const updateTitle = async () => {
    if (!selectedThread || !newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/conversations/${selectedThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        toast.success("Title updated successfully");
        setIsEditingTitle(false);
        fetchThreads();
      }
    } catch (err) {
      toast.error("Failed to update title");
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail || !newMsgContent.trim() || startingChat) return;

    setStartingChat(true);
    const user = users.find(u => u.email === selectedUserEmail);
    
    try {
      const res = await fetch("/api/contacts/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: selectedUserEmail, 
          content: newMsgContent,
          roleId: user?.roleId || null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success("Conversation started!");
        setNewMsgContent("");
        setSelectedUserEmail("");
        const newThread = json.data.conversation;
        await fetchThreads();
        setActiveTab("message");
        setSelectedThread(newThread);
      }
    } catch (err) {
      toast.error("Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedThread || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/contacts/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: selectedThread.email, 
          content: input,
          contactId: selectedThread.contactId,
          conversationId: selectedThread.id
        }),
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
      return <div className="p-8 text-center text-muted-foreground text-sm italic">No conversations found.</div>;
    }

    return threads.map((thread) => (
      <button
        key={thread.id}
        onClick={() => {
          setSelectedThread(thread);
          setActiveTab(thread.source as any);
          setIsEditingTitle(false);
          setNewTitle(thread.title || "");
        }}
        className={cn(
          "w-full text-left p-4 flex gap-3 transition-all hover:bg-primary/5 border-b border-primary/5 relative",
          selectedThread?.id === thread.id && "bg-primary/10 border-l-4 border-l-primary"
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary font-bold">{thread.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start">
            <p className={cn("text-sm truncate text-foreground", thread.unreadCount > 0 ? "font-black" : "font-semibold")}>
                {thread.title || thread.name || "Belum diberi judul"}
            </p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 opacity-70">
              {new Date(thread.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className={cn("text-[11px] truncate mt-0.5", thread.unreadCount > 0 ? "text-primary font-bold" : "text-muted-foreground opacity-60")}>
              {thread.lastMessage}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {thread.messageCount} msgs
                </span>
                <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">with {thread.email}</span>
            </div>
            {thread.unreadCount > 0 && (
                <span className="h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground animate-pulse shadow-sm shadow-primary/40">
                    {thread.unreadCount}
                </span>
            )}
          </div>
        </div>
      </button>
    ));
  };

  if (status === "loading") return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[750px] w-full gap-4 max-w-7xl mx-auto p-2">
      <Card className="w-full lg:w-80 flex flex-col border-primary/10 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="p-4 border-b border-primary/5 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Inbox</CardTitle>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-full", activeTab === "new-chat" && "bg-primary text-primary-foreground")}
                onClick={() => {
                    setActiveTab("new-chat");
                    setSelectedThread(null);
                }}
            >
                <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input placeholder="Search user..." className="pl-9 h-10 text-sm rounded-2xl bg-background/50 border-none ring-1 ring-primary/10 focus-visible:ring-primary/30" />
          </div>
          <Tabs value={activeTab} onValueChange={(value) => {
              if (value !== "new-chat") setActiveTab(value as any);
          }}>
            <TabsList className="w-full grid grid-cols-2 rounded-xl bg-background/50 p-1">
              <TabsTrigger value="message" className="rounded-lg text-xs">Direct</TabsTrigger>
              <TabsTrigger value="contact" className="rounded-lg text-xs">Public</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {activeTab === "message" && renderThreads(messageThreads)}
          {activeTab === "contact" && renderThreads(contactThreads)}
          {activeTab === "new-chat" && (
              <div className="p-4 text-center space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/20 flex items-center justify-center mx-auto">
                      <UserCircle className="h-10 w-10 text-primary/40" />
                  </div>
                  <div>
                      <h4 className="text-sm font-semibold">Start New Chat</h4>
                      <p className="text-[10px] text-muted-foreground">Select a user to initiate a direct conversation.</p>
                  </div>
              </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col border-primary/10 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden relative">
        {activeTab === "new-chat" ? (
             <div className="flex-1 flex flex-col p-8 md:p-12 max-w-2xl mx-auto w-full">
                <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Initiate Conversation</h2>
                        <p className="text-muted-foreground text-sm">Select one of your registered users to start a secure chat session.</p>
                    </div>
                    
                    <form onSubmit={startNewChat} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Recipient</label>
                            <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                                <SelectTrigger className="h-12 rounded-2xl border-primary/10 bg-background/50 backdrop-blur-sm">
                                    <SelectValue placeholder="Select a user by email..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-primary/10">
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.email} className="rounded-xl">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{u.name || "No Name"}</span>
                                                <span className="text-[10px] opacity-60">{u.email} ({u.role.name})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">First Message</label>
                            <textarea
                                value={newMsgContent}
                                onChange={(e) => setNewMsgContent(e.target.value)}
                                placeholder="Type the opening message here..."
                                className="w-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-primary/10 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20"
                            disabled={!selectedUserEmail || !newMsgContent.trim() || startingChat}
                        >
                            {startingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Invitation Chat
                        </Button>
                    </form>
                </div>
             </div>
        ) : selectedThread ? (
          <>
            <CardHeader className="p-4 border-b border-primary/5 bg-background/60 backdrop-blur-md flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{selectedThread.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="w-full max-w-[200px] md:max-w-[400px]">
                  {isEditingTitle ? (
                      <div className="flex items-center gap-2 animate-in zoom-in-95">
                          <Input 
                            value={newTitle} 
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="h-8 text-sm py-0 rounded-lg focus-visible:ring-primary/30" 
                            placeholder="Set title..."
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={updateTitle} disabled={loading}>
                              <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setIsEditingTitle(false)}>
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => (session?.user as any)?.role === "ADMIN" && setIsEditingTitle(true)}>
                        <CardTitle className="text-base font-extrabold truncate text-foreground/90">
                            {selectedThread.title || "Belum diberi judul"}
                        </CardTitle>
                        { (session?.user as any)?.role === "ADMIN" && <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-medium opacity-60 truncate">Shared with {selectedThread.name} ({selectedThread.email})</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <div className="hidden md:flex flex-col items-end mr-4">
                     <span className="text-[10px] font-bold text-green-500 animate-pulse uppercase tracking-widest leading-none">Live Connection</span>
                     <span className="text-[8px] opacity-40 uppercase">Channel: {selectedThread.id.slice(0,8)}...</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-primary/5 scroll-smooth"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary opacity-20" /></div>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === "admin";
                  const isMe = isAdmin && session?.user && (msg.senderId === (session.user as any).id);
                  
                  return (
                    <div
                      key={msg.id || idx}
                      className={cn(
                        "flex flex-col max-w-[80%] transition-all animate-in fade-in slide-in-from-bottom-2",
                        isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                          "px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group mb-1", 
                          isAdmin 
                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                            : "bg-background border border-primary/10 rounded-tl-none shadow-black/5"
                        )}>
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-40">
                         <span className={cn("text-[9px] font-bold tracking-tight", isAdmin ? "text-primary italic" : "")}>
                            {isMe ? "You" : (msg.sender.name || "Guest")}
                         </span>
                         <span className="text-[9px]">•</span>
                         <span className="text-[9px]">
                            {new Date(msg.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                         </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
            <CardFooter className="p-4 border-t border-primary/5 bg-background/80 backdrop-blur-md">
              <form onSubmit={sendReply} className="flex w-full gap-3">
                <div className="relative flex-1 group">
                    <Input
                      placeholder="Type a message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      className="flex-1 rounded-2xl px-5 h-12 border-primary/10 focus-visible:ring-primary/20 bg-background/50 backdrop-blur-sm transition-all group-hover:border-primary/30"
                    />
                </div>
                <Button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="rounded-2xl h-12 w-12 p-0 shadow-lg shadow-primary/20"
                  size="icon"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
            <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
                <MessageSquare className="h-20 w-20 text-primary/10 relative" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Select a Chat</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                    Pick a conversation from the sidebar or start a new one to begin messaging.
                </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
