"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  MessageSquare, Send, Loader2, Search, Edit2, Check, X,
  UserPlus, UserCircle, ChevronLeft,
  MoreVertical, Pin, PinOff, Star, Archive, ArchiveRestore,
  VolumeX, Bell, CheckCircle2, Trash2, Eraser,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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

type UserState = {
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isRead: boolean;
};

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
  userAlias?: string | null;
  adminAlias?: string | null;
  userState?: UserState;
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
  const [filterTab, setFilterTab] = useState("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [userNickname, setUserNickname] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // New Chat states
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [newMsgContent, setNewMsgContent] = useState("");
  const [startingChat, setStartingChat] = useState(false);

  // Browser Title Notification
  useEffect(() => {
    const unreadConvos = [...messageThreads, ...contactThreads].filter(t => t.unreadCount > 0).length;
    if (unreadConvos > 0) {
      document.title = `(${unreadConvos}) Inbox - Admin Dashboard`;
    } else {
      document.title = `Inbox - Admin Dashboard`;
    }
  }, [messageThreads, contactThreads]);

  useEffect(() => {
    fetchThreads();
    fetchUsers();

    const notificationChannel = pusherClient.subscribe("admin-notifications");
    
    const handleUpdate = (data: any) => {
      const updateList = (prev: Thread[]) => {
        const idx = prev.findIndex(t => t.id === data.conversationId);
        if (idx === -1) {
          fetchThreads();
          return prev;
        }
        const updated = [...prev];
        const thread = updated[idx];
        if (!thread) return prev;
        
        const isExternal = data.lastMessage.senderId !== session?.user?.id;
        const isCurrentlyViewed = selectedThread?.id === data.conversationId;
        
        const newThread: Thread = {
          ...thread,
          lastMessage: data.lastMessage.content,
          lastMessageAt: data.lastMessage.createdAt || new Date().toISOString(),
          unreadCount: (isExternal && !isCurrentlyViewed) ? (thread.unreadCount + 1) : thread.unreadCount,
          messageCount: thread.messageCount + 1,
        };
        
        updated[idx] = newThread;
        const [movedItem] = updated.splice(idx, 1);
        if (movedItem) updated.unshift(movedItem);
        return updated;
      };

      setMessageThreads(prev => updateList(prev));
      setContactThreads(prev => updateList(prev));
    };

    notificationChannel.bind("conversation-updated", handleUpdate);
    notificationChannel.bind("new-contact", () => fetchThreads());

    return () => {
      pusherClient.unsubscribe("admin-notifications");
    };
  }, [selectedThread?.id, session?.user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/contacts/conversations/${id}`, { method: "POST" });
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
            if (stillExists) return { ...prev, ...stillExists };
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
    markAsRead(identifier);

    const channelName = `conversation-${identifier}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
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

  // --- State Toggle Handlers ---
  const toggleState = async (id: string, stateKey: keyof UserState, currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      const res = await fetch(`/api/contacts/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [stateKey]: newValue }),
      });
      if (res.ok) {
        const updater = (prev: Thread[]) =>
          prev.map(t =>
            t.id === id
              ? { ...t, userState: { ...(t.userState || {}), [stateKey]: newValue } as UserState }
              : t
          );
        setMessageThreads(updater);
        setContactThreads(updater);
        if (selectedThread?.id === id) {
          setSelectedThread(prev => prev ? { ...prev, userState: { ...(prev.userState || {}), [stateKey]: newValue } as UserState } : prev);
        }
      }
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const handleClear = async (id: string) => {
    if (!confirm("Hapus semua pesan di percakapan ini?")) return;
    const res = await fetch(`/api/contacts/conversations/${id}?clear=true`, { method: "DELETE" });
    if (res.ok) {
      if (selectedThread?.id === id) setMessages([]);
      toast.success("Pesan berhasil dihapus");
      fetchThreads();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus seluruh percakapan ini? Tindakan tidak dapat dibatalkan.")) return;
    const res = await fetch(`/api/contacts/conversations/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedThread?.id === id) setSelectedThread(null);
      setMessageThreads(prev => prev.filter(t => t.id !== id));
      setContactThreads(prev => prev.filter(t => t.id !== id));
      toast.success("Percakapan berhasil dihapus");
    }
  };

  const updateAliases = async () => {
    if (!selectedThread) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/conversations/${selectedThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAlias: userNickname, adminAlias: adminNickname }),
      });
      if (res.ok) {
        toast.success("Nicknames updated");
        setIsEditingAlias(false);
        fetchThreads();
      }
    } catch (err) {
      toast.error("Failed to update nicknames");
    } finally {
      setLoading(false);
    }
  };

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

  // Filter & sort threads
  const getFilteredThreads = (threads: Thread[]) => {
    let filtered = threads;
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply tab filter
    switch (filterTab) {
      case "unread": filtered = filtered.filter(t => t.unreadCount > 0 || t.userState?.isRead === false); break;
      case "favorite": filtered = filtered.filter(t => t.userState?.isFavorite); break;
      case "archive": filtered = filtered.filter(t => t.userState?.isArchived); break;
      case "muted": filtered = filtered.filter(t => t.userState?.isMuted); break;
      default:
        // In "all" tab, hide archived unless in archive tab
        filtered = filtered.filter(t => !t.userState?.isArchived);
    }
    
    // Sort: pinned first
    return filtered.sort((a, b) => {
      if (a.userState?.isPinned && !b.userState?.isPinned) return -1;
      if (!a.userState?.isPinned && b.userState?.isPinned) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  };

  const renderThreads = (threads: Thread[]) => {
    if (loadingThreads) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 opacity-30" /></div>;
    }

    const filtered = getFilteredThreads(threads);
    
    if (filtered.length === 0) {
      return <div className="p-8 text-center text-muted-foreground text-sm italic">Tidak ada percakapan ditemukan.</div>;
    }

    return filtered.map((thread) => (
      <div key={thread.id} className="relative group border-b border-primary/5">
        <button
          onClick={() => {
            setSelectedThread(thread);
            setActiveTab(thread.source as any);
            setIsEditingTitle(false);
            setNewTitle(thread.title || "");
            setIsEditingAlias(false);
          }}
          className={cn(
            "w-full text-left p-4 flex gap-3 transition-all hover:bg-primary/5 relative pr-10",
            selectedThread?.id === thread.id && "bg-primary/10 border-l-4 border-l-primary"
          )}
        >
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn(
                "font-bold text-sm",
                selectedThread?.id === thread.id ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
              )}>
                {thread.name[0]}
              </AvatarFallback>
            </Avatar>
            {thread.userState?.isMuted && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                <VolumeX className="h-2 w-2 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {thread.userState?.isPinned && <Pin className="h-3 w-3 text-primary shrink-0 rotate-45" />}
                {thread.userState?.isFavorite && <Star className="h-3 w-3 text-amber-400 shrink-0 fill-amber-400" />}
                <p className={cn("text-sm truncate text-foreground", thread.unreadCount > 0 ? "font-black" : "font-semibold")}>
                    {thread.title || thread.userAlias || thread.name || "Belum diberi judul"}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 opacity-70">
                {new Date(thread.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
            <p className={cn("text-[11px] truncate mt-0.5", thread.unreadCount > 0 ? "text-primary font-bold" : "text-muted-foreground opacity-60")}>
                {thread.adminAlias ? `[${thread.adminAlias}] ` : ""}{thread.lastMessage}
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
        {/* Context Menu */}
        <div className="absolute right-1 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-2xl">
              <DropdownMenuItem
                onClick={() => toggleState(thread.id, "isPinned", !!thread.userState?.isPinned)}
                className="gap-2 text-xs"
              >
                {thread.userState?.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                {thread.userState?.isPinned ? "Lepas Sematan" : "Sematkan"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleState(thread.id, "isFavorite", !!thread.userState?.isFavorite)}
                className="gap-2 text-xs"
              >
                <Star className={cn("h-3.5 w-3.5", thread.userState?.isFavorite && "fill-amber-400 text-amber-400")} />
                {thread.userState?.isFavorite ? "Hapus Favorit" : "Tandai Favorit"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleState(thread.id, "isArchived", !!thread.userState?.isArchived)}
                className="gap-2 text-xs"
              >
                {thread.userState?.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {thread.userState?.isArchived ? "Buka Arsip" : "Arsipkan"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleState(thread.id, "isMuted", !!thread.userState?.isMuted)}
                className="gap-2 text-xs"
              >
                {thread.userState?.isMuted ? <Bell className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {thread.userState?.isMuted ? "Bunyikan Notifikasi" : "Bisukan Notifikasi"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleState(thread.id, "isRead", thread.unreadCount === 0 && (thread.userState?.isRead ?? true))}
                className="gap-2 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {thread.unreadCount > 0 || !thread.userState?.isRead ? "Tandai Sudah Dibaca" : "Tandai Belum Dibaca"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleClear(thread.id)}
                className="gap-2 text-xs text-orange-500 focus:text-orange-500"
              >
                <Eraser className="h-3.5 w-3.5" /> Kosongkan Pesan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(thread.id)}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Percakapan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    ));
  };

  const totalUnread = messageThreads.reduce((s, t) => s + t.unreadCount, 0);

  if (status === "loading") return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-250px)] lg:h-[750px] w-full gap-4 max-w-7xl mx-auto p-2">
      <Card className={cn(
        "w-full lg:w-80 flex flex-col border-primary/10 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden shrink-0",
        (selectedThread || activeTab === "new-chat") && "hidden lg:flex"
      )}>
        <CardHeader className="p-4 border-b border-primary/5 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Inbox</CardTitle>
            </div>
            <div className="flex items-center gap-2">
               {totalUnread > 0 && (
                 <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {totalUnread} NEW
                 </span>
               )}
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
          </div>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
            <Input
              placeholder="Cari percakapan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-2xl bg-background/50 border-none ring-1 ring-primary/10 focus-visible:ring-primary/30"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-background/50 rounded-xl overflow-x-auto no-scrollbar">
            {['all', 'unread', 'favorite', 'archive', 'muted'].map(t => (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={cn(
                  "whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all flex-shrink-0",
                  filterTab === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === 'unread' ? `Belum Dibaca${totalUnread > 0 ? ` (${totalUnread})` : ''}` :
                 t === 'all' ? 'Semua' :
                 t === 'favorite' ? 'Favorit' :
                 t === 'archive' ? 'Arsip' : 'Dibisukan'}
              </button>
            ))}
          </div>
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
                      <h4 className="text-sm font-semibold">Mulai Chat Baru</h4>
                      <p className="text-[10px] text-muted-foreground">Pilih pengguna untuk memulai percakapan langsung.</p>
                  </div>
              </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn(
        "flex-1 flex flex-col border-primary/10 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden relative",
        (!selectedThread && activeTab !== "new-chat") && "hidden lg:flex"
      )}>
        {activeTab === "new-chat" ? (
             <div className="flex-1 flex flex-col p-4 md:p-12 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-2 mb-4 lg:hidden">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 -ml-1" 
                        onClick={() => setActiveTab("message")}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-bold">New Chat</span>
                </div>
                <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Mulai Percakapan</h2>
                        <p className="text-muted-foreground text-sm">Pilih pengguna terdaftar untuk memulai sesi chat langsung.</p>
                    </div>
                    
                    <form onSubmit={startNewChat} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Penerima</label>
                            <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                                <SelectTrigger className="h-12 rounded-2xl border-primary/10 bg-background/50 backdrop-blur-sm">
                                    <SelectValue placeholder="Pilih pengguna berdasarkan email..." />
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
                            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">Pesan Pertama</label>
                            <textarea
                                value={newMsgContent}
                                onChange={(e) => setNewMsgContent(e.target.value)}
                                placeholder="Ketik pesan pembuka di sini..."
                                className="w-full min-h-[120px] p-4 rounded-2xl bg-background/50 border border-primary/10 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20"
                            disabled={!selectedUserEmail || !newMsgContent.trim() || startingChat}
                        >
                            {startingChat ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Kirim Pesan Undangan
                        </Button>
                    </form>
                </div>
             </div>
        ) : selectedThread ? (
          <>
            <CardHeader className="p-3 md:p-4 border-b border-primary/5 bg-background/60 backdrop-blur-md flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden h-8 w-8 -ml-1 shrink-0" 
                  onClick={() => {
                    setSelectedThread(null);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-primary/10">
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
                        {selectedThread.userState?.isPinned && <Pin className="h-3 w-3 text-primary rotate-45 opacity-60" />}
                        {selectedThread.userState?.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 opacity-80" />}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium opacity-60 truncate">Berbagi dengan {selectedThread.userAlias || selectedThread.name} ({selectedThread.email})</p>
                    <button onClick={() => {
                      setUserNickname(selectedThread.userAlias || "");
                      setAdminNickname(selectedThread.adminAlias || "");
                      setIsEditingAlias(!isEditingAlias);
                    }} className="opacity-20 hover:opacity-100 p-0.5">
                      <UserCircle className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative">
                 {isEditingAlias && (
                   <div className="absolute right-0 top-12 z-50 bg-background border rounded-2xl shadow-2xl p-4 w-64 animate-in fade-in zoom-in-95">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-3 opacity-60">Nama Panggilan</p>
                      <div className="space-y-3 font-normal">
                         <div>
                           <label className="text-[9px] font-bold ml-1 mb-1">Nama Pengguna</label>
                           <Input value={userNickname} onChange={e => setUserNickname(e.target.value)} className="h-9 text-xs rounded-xl" />
                         </div>
                         <div>
                           <label className="text-[9px] font-bold ml-1 mb-1">Nama Admin (Anda)</label>
                           <Input value={adminNickname} onChange={e => setAdminNickname(e.target.value)} className="h-9 text-xs rounded-xl" />
                         </div>
                         <div className="flex gap-2 pt-1">
                           <Button size="sm" className="h-8 flex-1 rounded-xl text-xs font-bold" onClick={updateAliases}>Simpan</Button>
                           <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => setIsEditingAlias(false)}>Batal</Button>
                         </div>
                      </div>
                   </div>
                 )}
                 <div className="hidden md:flex flex-col items-end mr-4">
                     <span className="text-[10px] font-bold text-green-500 animate-pulse uppercase tracking-widest leading-none">Live Connection</span>
                     <span className="text-[8px] opacity-40 uppercase">Channel: {selectedThread.id.slice(0,8)}...</span>
                 </div>
                 {/* Quick actions for active thread */}
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                       <MoreVertical className="h-4 w-4" />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl">
                     <DropdownMenuItem
                       onClick={() => toggleState(selectedThread.id, "isPinned", !!selectedThread.userState?.isPinned)}
                       className="gap-2 text-xs"
                     >
                       {selectedThread.userState?.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                       {selectedThread.userState?.isPinned ? "Lepas Sematan" : "Sematkan"}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => toggleState(selectedThread.id, "isFavorite", !!selectedThread.userState?.isFavorite)}
                       className="gap-2 text-xs"
                     >
                       <Star className={cn("h-4 w-4", selectedThread.userState?.isFavorite && "fill-amber-400 text-amber-400")} />
                       {selectedThread.userState?.isFavorite ? "Hapus Favorit" : "Tandai Favorit"}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => toggleState(selectedThread.id, "isArchived", !!selectedThread.userState?.isArchived)}
                       className="gap-2 text-xs"
                     >
                       {selectedThread.userState?.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                       {selectedThread.userState?.isArchived ? "Buka Arsip" : "Arsipkan"}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => toggleState(selectedThread.id, "isMuted", !!selectedThread.userState?.isMuted)}
                       className="gap-2 text-xs"
                     >
                       {selectedThread.userState?.isMuted ? <Bell className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                       {selectedThread.userState?.isMuted ? "Bunyikan Notifikasi" : "Bisukan Notifikasi"}
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                       onClick={() => handleClear(selectedThread.id)}
                       className="gap-2 text-xs text-orange-500 focus:text-orange-500"
                     >
                       <Eraser className="h-4 w-4" /> Kosongkan Pesan
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => handleDelete(selectedThread.id)}
                       className="gap-2 text-xs text-destructive focus:text-destructive"
                     >
                       <Trash2 className="h-4 w-4" /> Hapus Percakapan
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-primary/5 scroll-smooth"
            >
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary opacity-20" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <MessageSquare className="h-16 w-16 mb-3" />
                  <p className="text-sm font-bold uppercase tracking-widest">Mulai Percakapan</p>
                </div>
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
                      <div className="max-w-full">
                        {!isMe && (
                          <span className="text-[10px] font-bold mb-1 block opacity-50 px-1">
                            {isAdmin ? `Admin - ${selectedThread?.adminAlias || msg.sender.name || "Support"}` : (selectedThread?.userAlias || msg.sender.name || "Guest")}
                          </span>
                        )}
                        <div className={cn(
                            "px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group mb-1", 
                            isAdmin 
                              ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                              : "bg-background border border-primary/10 rounded-tl-none shadow-black/5"
                          )}>
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-40">
                         <span className={cn("text-[9px] font-bold tracking-tight", isAdmin ? "text-primary italic" : "")}>
                            {isMe ? "Anda" : (isAdmin ? (selectedThread?.adminAlias || msg.sender.name || "Support") : (selectedThread?.userAlias || msg.sender.name || "Guest"))}
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
                      placeholder="Ketik pesan..."
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
                <h3 className="text-xl font-bold tracking-tight">Pilih Percakapan</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
                    Pilih percakapan dari sidebar atau mulai yang baru untuk mengobrol.
                </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
