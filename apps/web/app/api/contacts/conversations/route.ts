import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    // Get messages to find real conversations (Admin vs User)
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
    });

    const threadsMap = new Map();

    // 1. Process Message history first for real two-way chats
    messages.forEach((msg) => {
      // Group by channel (email) only to consolidate the entire conversation
      const key = msg.channelId;
      
      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          email: msg.channelId,
          name: msg.senderName || msg.channelId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          messageCount: 1,
        });
      } else {
        const existing = threadsMap.get(key);
        // Only update if this message is newer
        if (new Date(msg.createdAt) > new Date(existing.lastMessageAt)) {
          existing.lastMessage = msg.content;
          existing.lastMessageAt = msg.createdAt;
        }
        existing.messageCount += 1;
      }
    });

    // 2. Add Contact form submissions
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    contacts.forEach((contact) => {
      const key = contact.email;
      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          email: contact.email,
          name: contact.name,
          lastMessage: contact.message,
          lastMessageAt: contact.createdAt,
          messageCount: 1,
        });
      }
    });

    return ApiResponse.success({
      data: Array.from(threadsMap.values()),
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
