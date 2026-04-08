import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("id"); // conversationId

    if (!identifier) {
      return ApiResponse.error("Conversation ID required", 400);
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: identifier
      },
      include: {
        user: { select: { name: true, email: true } },
        conversation: { select: { title: true, userAlias: true, adminAlias: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const normalizedMessages = messages.map(m => {
        const isSenderAdmin = m.isAdmin;
        let senderName = m.user?.name || m.senderEmail || "Guest";
        
        if (m.conversation) {
          if (isSenderAdmin) {
            senderName = m.conversation.adminAlias || m.user?.name || "Admin";
            senderName = `Admin - ${senderName}`;
          } else {
            senderName = m.conversation.userAlias || m.user?.name || "User";
          }
        }
        
        return {
          ...m,
          senderRole: isSenderAdmin ? "admin" : "user",
          sender: { name: senderName }
        };
    });

    return ApiResponse.success({ data: normalizedMessages });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
