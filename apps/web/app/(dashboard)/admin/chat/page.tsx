"use client";

import ChatRoom from "@/components/chat-room";
import ContactForm from "@/components/contact-form";
import ConversationChat from "@/components/conversation-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export default function RealtimeLiveChat() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 md:py-8 px-4">
      <Tabs defaultValue="grouped" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="grid w-full max-w-[700px] grid-cols-3 p-1.5 h-14 rounded-2xl border-primary/20 bg-background/50 backdrop-blur-md shadow-lg">
            <TabsTrigger value="grouped" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Grouped Chat
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Public Chat
            </TabsTrigger>
            <TabsTrigger value="new-chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Start New Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ChatRoom />
        </TabsContent>

        <TabsContent value="grouped" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ConversationChat />
        </TabsContent>

        <TabsContent value="new-chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ConversationChat defaultTab="new-chat" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
