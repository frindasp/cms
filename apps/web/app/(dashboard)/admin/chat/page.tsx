"use client";

import ChatRoom from "@/components/chat-room";
import ConversationChat from "@/components/conversation-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export default function RealtimeLiveChat() {
  return (
    <div className="h-full flex flex-col space-y-2 md:space-y-4 max-w-7xl mx-auto w-full">
      <Tabs defaultValue="grouped" className="w-full h-full flex flex-col">
        <div className="flex justify-center shrink-0 mb-2 md:mb-4 px-2 md:px-0">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1 h-10 md:h-12 rounded-2xl border-primary/20 bg-background/50 backdrop-blur-md shadow-lg">
            <TabsTrigger value="grouped" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 text-xs md:text-sm">
               Grouped Chat
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 text-xs md:text-sm">
               Public Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300 m-0">
          <ChatRoom />
        </TabsContent>

        <TabsContent value="grouped" className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-300 m-0">
          <ConversationChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
