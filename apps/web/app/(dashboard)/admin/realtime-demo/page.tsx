"use client";

import ChatRoom from "@/components/chat-room";
import ContactForm from "@/components/contact-form";
import ConversationChat from "@/components/conversation-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export default function RealtimeDemo() {
  return (
    <div className="space-y-12 max-w-6xl mx-auto py-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Real-time Experience
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the power of real-time communication with Pusher. Grouping contacts by email for better conversation management!
        </p>
      </div>

      <Tabs defaultValue="grouped" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="grid w-full max-w-[700px] grid-cols-3 p-1.5 h-14 rounded-2xl border-primary/20 bg-background/50 backdrop-blur-md shadow-lg">
            <TabsTrigger value="grouped" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Grouped Chat
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Public Chat
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Contact Form
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ChatRoom />
        </TabsContent>

        <TabsContent value="grouped" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ConversationChat />
        </TabsContent>

        <TabsContent value="contact" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ContactForm />
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-8 items-center bg-card/50 backdrop-blur-xl border border-primary/10 rounded-3xl p-8 shadow-2xl">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold italic">How it works?</h2>
            <ul className="space-y-3">
               <li className="flex items-start gap-2">
                   <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">1</div>
                   <p className="text-sm text-muted-foreground">User submits the <span className="text-foreground font-medium">Contact Form</span> via the Public API.</p>
               </li>
               <li className="flex items-start gap-2">
                   <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">2</div>
                   <p className="text-sm text-muted-foreground">The server saves the contact to <span className="text-foreground font-medium">Prisma Database</span>.</p>
               </li>
               <li className="flex items-start gap-2">
                   <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">3</div>
                   <p className="text-sm text-muted-foreground">The server triggers a <span className="text-foreground font-medium">Pusher Event</span> on the "chat-room" channel.</p>
               </li>
               <li className="flex items-start gap-2">
                   <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">4</div>
                   <p className="text-sm text-muted-foreground">The <span className="text-foreground font-medium">Chat Room</span> UI receives the event and updates instantly.</p>
               </li>
            </ul>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative p-6 bg-background rounded-2xl border border-primary/10">
                <p className="text-xs font-mono text-primary/80 mb-2">// Server-side snippet</p>
                <pre className="text-xs overflow-x-auto text-muted-foreground">
{`await pusherServer.trigger(
  "chat-room", 
  "new-message", 
  { content, sender: "System" }
);`}
                </pre>
            </div>
          </div>
      </div>
    </div>
  );
}
