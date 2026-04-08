"use client";

import ChatRoom from "@/components/chat-room";
import ConversationChat from "@/components/conversation-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export default function RealtimeLiveChat() {
  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl mx-auto py-2 md:py-8 px-2 md:px-4 min-h-[calc(100vh-100px)]">
      <Tabs defaultValue="grouped" className="w-full">
        <div className="flex justify-center mb-4 md:mb-10 px-2 md:px-0">
          <TabsList className="grid w-full max-w-[500px] grid-cols-2 p-1 h-12 md:h-14 rounded-2xl border-primary/20 bg-background/50 backdrop-blur-md shadow-lg">
            <TabsTrigger value="grouped" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Grouped Chat
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300">
               Public Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ChatRoom />
        </TabsContent>

        <TabsContent value="grouped" className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <ConversationChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
