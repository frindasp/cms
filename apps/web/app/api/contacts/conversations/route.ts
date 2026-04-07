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
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            user: { select: { name: true } },
            contact: { select: { name: true, email: true } },
          },
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: "desc" },
    });

    // Match the existing UI format
    const allThreads: Thread[] = conversations.map(conv => {
      const lastMsg = conv.messages[0];
      return {
        id: conv.id,
        email: conv.email,
        name: conv.name || conv.email,
        lastMessage: lastMsg?.content || "No messages",
        lastMessageAt: lastMsg?.createdAt || conv.createdAt,
        messageCount: conv._count.messages,
        source: "message",
        contactId: lastMsg?.contactId || null,
      } as any;
    });

    return ApiResponse.success({
      data: {
        messageThreads: allThreads,
        contactThreads: [], // For simplicity, merging them for now or handling as before if needed
      },
    });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return ApiResponse.internalError(error);
  }
}
