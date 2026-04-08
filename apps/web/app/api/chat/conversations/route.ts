import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const adminId = (session.user as any).id;

    // Get all conversations with their latest message
    const conversations = await prisma.conversation.findMany({
      include: {
        readStates: {
          where: { userId: adminId }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const messageThreads = conversations.map(conv => {
      const state = conv.readStates[0] || {} as any;
      const lastMessage = conv.messages[0];
      
      let unreadCount = 0;
      if (!state.isRead && lastMessage && !lastMessage.isAdmin) {
          unreadCount = 1; // Simplified
      }

      return {
        id: conv.id,
        email: conv.email,
        name: conv.name,
        title: conv.title,
        lastMessage: lastMessage?.content || "No messages yet",
        lastMessageAt: lastMessage?.createdAt?.toISOString() || conv.updatedAt.toISOString(),
        messageCount: conv.messages.length, 
        unreadCount,
        source: "message",
        roleId: conv.roleId,
        userAlias: conv.userAlias,
        adminAlias: conv.adminAlias,
        userState: {
          isPinned: state.isPinned || false,
          isFavorite: state.isFavorite || false,
          isArchived: state.isArchived || false,
          isMuted: state.isMuted || false,
          isRead: state.isRead ?? true
        }
      };
    });

    return ApiResponse.success({
      data: {
        messageThreads
      }
    });

  } catch (error) {
    console.error("Fetch conversations error:", error);
    return ApiResponse.internalError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { email, content, roleId } = await request.json();
    if (!email || !content) return ApiResponse.error("Email and content required", 400);

    const conversation = await prisma.conversation.create({
      data: {
        email,
        name: email.split("@")[0],
        title: "New Chat",
        roleId: roleId || "user-id", // Should probably resolve correctly
        updatedAt: new Date()
      }
    });

    return ApiResponse.success({
      data: { conversation }
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
