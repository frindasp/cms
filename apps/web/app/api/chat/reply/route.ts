import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { email, content, conversationId } = await request.json();

    if (!content || !conversationId) {
      return ApiResponse.error("Content and conversationId are required", 400);
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderEmail: email || session.user.email,
        senderId: (session.user as any).id,
        conversationId,
        isAdmin: true,
        status: 'SENT',
      },
      include: {
        user: { select: { name: true } },
        conversation: { select: { adminAlias: true } }
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    const senderName = message.conversation?.adminAlias 
       || message.user?.name 
       || "Support";

    const pusherMessage = {
      ...message,
      senderRole: "admin",
      sender: { name: senderName }
    };

    await pusherServer.trigger(`conversation-${conversationId}`, "new-message", pusherMessage);
    await pusherServer.trigger("user-notifications", "conversation-updated", {
      conversationId: conversationId,
      lastMessage: pusherMessage
    });

    return ApiResponse.success({ data: pusherMessage });
  } catch (error) {
    console.error("Reply error:", error);
    return ApiResponse.internalError(error);
  }
}
