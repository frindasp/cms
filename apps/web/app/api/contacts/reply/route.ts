import { prisma } from "@workspace/database";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  try {
    const { email, content, contactId, conversationId } = await request.json();

    if ((!email && !conversationId) || !content) {
      return ApiResponse.error("Email/ID and content are required", 400);
    }

    // 1. Find or create conversation
    let conversation = null;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
    } else {
      conversation = await prisma.conversation.findFirst({
        where: { email }
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          email,
          name: email.split("@")[0], // Fallback name
        }
      });
    }

    // 2. Store admin reply linked to conversation
    const message = await prisma.message.create({
      data: {
        content,
        senderId: (session.user as any).id,
        senderEmail: session.user.email,
        contactId: contactId,
        conversationId: conversation.id,
        isAdmin: true,
      },
      include: {
        user: { select: { name: true } }
      }
    });
    
    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    const adminName = (conversation as any).adminAlias || session.user.name || "Support";
    const displayName = `Admin - ${adminName}`;

    const pusherMessage = {
      id: message.id,
      content,
      senderId: (session.user as any).id,
      sender: {
        name: displayName,
      },
      senderRole: "admin",
      isAdmin: true,
      createdAt: message.createdAt.toISOString(),
      conversationId: conversation.id,
    };

    // Trigger on the specific conversation channel
    const channelName = `conversation-${conversation.id}`;
    await pusherServer.trigger(channelName, "new-message", pusherMessage);

    // Also notify global admin-notifications for list updates
    await pusherServer.trigger("admin-notifications", "conversation-updated", {
      conversationId: conversation.id,
      lastMessage: pusherMessage,
    });

    return ApiResponse.success({ data: message });
  } catch (error: any) {
    console.error("Reply error:", error);
    return ApiResponse.internalError(error);
  }
}
