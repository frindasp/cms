import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

type Thread = {
  email: string;
  name: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  source: "message" | "contact";
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIdByChannel = new Map<string, string>();
    messages.forEach((msg: (typeof messages)[number]) => {
      if (msg.senderRole === "user" && msg.senderId) {
        userIdByChannel.set(msg.channelId, msg.senderId);
      }
    });

    const messageThreadsMap = new Map<string, Thread>();

    messages.forEach((msg: (typeof messages)[number]) => {
      const userIdKey = userIdByChannel.get(msg.channelId);
      const key = userIdKey ? `user:${userIdKey}` : `email:${msg.channelId}`;

      if (!messageThreadsMap.has(key)) {
        messageThreadsMap.set(key, {
          email: msg.channelId,
          name: msg.senderRole === "user" && msg.senderName ? msg.senderName : msg.channelId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          messageCount: 1,
          source: "message",
        });
        return;
      }

      const existing = messageThreadsMap.get(key)!;

      if (new Date(msg.createdAt) > new Date(existing.lastMessageAt)) {
        existing.lastMessage = msg.content;
        existing.lastMessageAt = msg.createdAt;
      }

      if (msg.senderRole === "user" && msg.senderName) {
        existing.name = msg.senderName;
      }

      existing.messageCount += 1;
    });

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    const contactThreadsMap = new Map<string, Thread>();
    contacts.forEach((contact: (typeof contacts)[number]) => {
      const key = contact.email;
      if (!contactThreadsMap.has(key)) {
        contactThreadsMap.set(key, {
          email: contact.email,
          name: contact.name,
          lastMessage: contact.message,
          lastMessageAt: contact.createdAt,
          messageCount: 1,
          source: "contact",
        });
        return;
      }

      const existing = contactThreadsMap.get(key)!;
      if (new Date(contact.createdAt) > new Date(existing.lastMessageAt)) {
        existing.lastMessage = contact.message;
        existing.lastMessageAt = contact.createdAt;
      }

      existing.messageCount += 1;
    });

    return ApiResponse.success({
      data: {
        messageThreads: Array.from(messageThreadsMap.values()),
        contactThreads: Array.from(contactThreadsMap.values()),
      },
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
