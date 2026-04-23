import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { messageId, conversationId, status } = await request.json();

    if (!status || (!messageId && !conversationId)) {
      return ApiResponse.error("status and (messageId or conversationId) are required", 400);
    }

    if (messageId) {
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { 
          status,
          isRead: status === 'READ' ? true : undefined
        },
      });

      await pusherServer.trigger(`conversation-${message.conversationId}`, "message-status-updated", {
        messageId: message.id,
        status,
        conversationId: message.conversationId,
      });
    } else if (conversationId) {
      await prisma.message.updateMany({
        where: { 
          conversationId, 
          status: status === 'READ' ? { not: 'READ' } : { notIn: ['READ', 'DELIVERED'] } 
        },
        data: { 
          status,
          isRead: status === 'READ' ? true : undefined
        },
      });

      await pusherServer.trigger(`conversation-${conversationId}`, "conversation-status-updated", {
        conversationId,
        status,
      });
    }

    return ApiResponse.success({ message: "Status updated" });
  } catch (error) {
    console.error("Status update error:", error);
    return ApiResponse.internalError(error);
  }
}
