import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { pusherServer } from "@/lib/pusher";

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
      },
      orderBy: { updatedAt: "desc" },
    });

    const currentUserId = (session.user as any).id;
    const readStates = await prisma.conversationReadState.findMany({
      where: {
        conversationId: { in: conversations.map(c => c.id) },
        userId: currentUserId,
      }
    });

    const stateMap = readStates.reduce<Record<string, typeof readStates[0]>>((acc, s) => {
      acc[s.conversationId] = s;
      return acc;
    }, {});

    const allThreadsPromise = conversations.map(async conv => {
      const lastMsg = conv.messages[0];
      const roleName = lastMsg?.user?.role?.name;
      const state = stateMap[conv.id];
      
      const lastRead = state?.lastReadAt || new Date(0);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          isAdmin: false, // Admin only cares about messages from User
          createdAt: { gt: lastRead }
        }
      });

      return {
        id: conv.id,
        email: conv.email,
        title: conv.title,
        userAlias: conv.userAlias,
        adminAlias: conv.adminAlias,
        name: `${conv.userAlias || conv.name || conv.email}${roleName ? ` (${roleName})` : ""}`,
        lastMessage: lastMsg?.content || "No messages",
        lastMessageAt: lastMsg?.createdAt || conv.createdAt,
        messageCount: await prisma.message.count({ where: { conversationId: conv.id } }),
        unreadCount: unreadCount,
        source: "message",
        contactId: lastMsg?.contactId || null,
        roleId: conv.roleId,
        userState: {
          isPinned: state?.isPinned ?? false,
          isFavorite: state?.isFavorite ?? false,
          isArchived: state?.isArchived ?? false,
          isMuted: state?.isMuted ?? false,
          isRead: state?.isRead ?? true,
        },
      };
    });

    const allThreads = await Promise.all(allThreadsPromise);

    // Sort: pinned first, then by date
    allThreads.sort((a, b) => {
      if (a.userState.isPinned && !b.userState.isPinned) return -1;
      if (!a.userState.isPinned && b.userState.isPinned) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return ApiResponse.success({
      data: {
        messageThreads: allThreads,
        contactThreads: [],
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
    let conversation = await prisma.conversation.findFirst({
      where: {
        email,
        roleId: roleId || null
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
    
    // 3. Trigger Pusher so the user sees the new message/thread in real-time
    try {
      const pusherMessage = {
        ...message,
        senderRole: "admin",
        sender: { name: `Admin - ${session.user.name || "Support"}` }
      };
      // Try triggering to user-specific channel as well if they aren't on conversation ID yet
      const userChannel = `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const convChannel = `conversation-${conversation.id}`;
      
      await Promise.all([
        pusherServer.trigger(convChannel, "new-message", pusherMessage),
        pusherServer.trigger(userChannel, "conversation-created", { conversation, message: pusherMessage })
      ]);
    } catch (e) {
      console.error("Pusher trigger failed in conversation creation:", e);
    }

    // 4. Log activity
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
