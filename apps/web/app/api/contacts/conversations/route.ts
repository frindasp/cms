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
  contactId: string | null;
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const [messages, contacts] = await Promise.all([
      prisma.message.findMany({
        include: {
          user: { select: { name: true } },
          contact: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.findMany({
        orderBy: { createdAt: "desc" },
      })
    ]);

    const threadsMap = new Map<string, Thread>();

    // 1. Initialize threads from Contacts first (since they are the primary source of conversation identity)
    contacts.forEach((contact: (typeof contacts)[number]) => {
      const key = contact.email;
      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          email: contact.email,
          name: contact.name,
          lastMessage: contact.message,
          lastMessageAt: contact.createdAt,
          messageCount: 1,
          source: "contact",
          contactId: contact.id,
        });
      } else {
        const existing = threadsMap.get(key)!;
        if (new Date(contact.createdAt) > new Date(existing.lastMessageAt)) {
          existing.lastMessage = contact.message;
          existing.lastMessageAt = contact.createdAt;
        }
        existing.messageCount += 1;
      }
    });

    // 2. Process Messages and merge them into the threads
    messages.forEach((msg: (typeof messages)[number]) => {
      const threadEmail = msg.contact?.email || (!msg.isAdmin ? msg.senderEmail : null);
      if (!threadEmail) return;

      const key = threadEmail;
      
      if (!threadsMap.has(key)) {
        threadsMap.set(key, {
          email: threadEmail,
          name: msg.user?.name || msg.contact?.name || threadEmail,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          messageCount: 1,
          source: "message", // Message records are always messages
          contactId: msg.contactId,
        });
      } else {
        const existing = threadsMap.get(key)!;
        
        if (new Date(msg.createdAt) > new Date(existing.lastMessageAt)) {
          existing.lastMessage = msg.content;
          existing.lastMessageAt = msg.createdAt;
        }
        
        // If there's a Message record OR an admin has replied, it's a "message" source conversation
        existing.source = "message";
        
        if (!existing.contactId && msg.contactId) {
          existing.contactId = msg.contactId;
        }

        existing.messageCount += 1;
      }
    });

    const allThreads = Array.from(threadsMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    
    // Separate: contact source threads remain in contact until they become message source
    const contactThreads = allThreads.filter(t => t.source === "contact");
    const messageThreads = allThreads.filter(t => t.source === "message");

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
