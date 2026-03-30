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
      include: {
        user: { select: { name: true } },
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const messageThreadsMap = new Map<string, Thread>();

    messages.forEach((msg: (typeof messages)[number]) => {
      const key =
        msg.senderEmail ??
        msg.contactId ??
        `message-${msg.id}`;
      const displayEmail = msg.senderEmail ?? key;
      const isAdmin = msg.isAdmin;
      const displayName =
        !isAdmin && (msg.contact?.name || msg.user?.name) 
          ? (msg.contact?.name || msg.user?.name)! 
          : displayEmail;

      if (!messageThreadsMap.has(key)) {
        messageThreadsMap.set(key, {
          email: displayEmail,
          name: displayName,
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

      if (!isAdmin && (msg.contact?.name || msg.user?.name)) {
        existing.name = (msg.contact?.name || msg.user?.name)!;
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

    const messageThreads = Array.from(messageThreadsMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    const contactThreads = Array.from(contactThreadsMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return ApiResponse.success({
      data: {
        messageThreads,
        contactThreads,
      },
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
