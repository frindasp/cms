import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";

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
            user: { include: { role: true } },
            contact: { select: { name: true, email: true } },
          },
        },
        _count: {
          select: { 
            messages: {
              where: { isAdmin: false, isRead: false }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
    });

    const allThreads: any[] = conversations.map(conv => {
      const lastMsg = conv.messages[0];
      const roleName = lastMsg?.user?.role?.name;
      return {
        id: conv.id,
        email: conv.email,
        title: conv.title,
        name: `${conv.name || conv.email}${roleName ? ` (${roleName})` : ""}`,
        lastMessage: lastMsg?.content || "No messages",
        lastMessageAt: lastMsg?.createdAt || conv.createdAt,
        messageCount: conv.messages.length, // Total messages count if needed separately
        unreadCount: (conv._count as any).messages,
        source: "message",
        contactId: lastMsg?.contactId || null,
      };
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  try {
    const { email, roleId, content, title } = await request.json();

    if (!email || !content) {
      return ApiResponse.error("Email and content are required", 400);
    }

    // 1. Find or create conversation with correct roleId
    // If same email but different role, it will be a distinct conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        email_roleId: {
          email,
          roleId: roleId || null
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          email,
          roleId: roleId || null,
          title: title || null,
          name: email.split("@")[0], // Fallback name
        }
      });
    }

    // 2. Create the initial message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: (session.user as any).id,
        senderEmail: session.user.email,
        conversationId: conversation.id,
        isAdmin: session.user.role === "ADMIN",
      },
    });

    // 3. Log activity
    await logActivity({
      userId: session.user.id,
      action: "START_CONVERSATION",
      description: `Started new conversation with ${email} (Role: ${roleId || "Public"})`,
      route: "/api/contacts/conversations",
      method: "POST",
      metadata: { conversationId: conversation.id }
    });

    return ApiResponse.success({ 
      data: { conversation, message } 
    }, 201);
  } catch (error: any) {
    console.error("Start conversation error:", error);
    return ApiResponse.internalError(error);
  }
}
