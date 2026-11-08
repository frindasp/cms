import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { pusherServer } from "@/lib/pusher";

function formatAdminSender(roleName?: string | null, name?: string | null, email?: string | null): string {
  const role = roleName || "Admin";
  let initial = "";
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    initial = parts.length > 1 ? parts.map(p => p[0]?.toUpperCase() || "").join("") : name.slice(0, 2).toUpperCase();
  } else if (email) {
    const localPart = email.split("@")[0] || "";
    const noVowels = localPart.replace(/[aeiouAEIOU]/g, "");
    initial = (noVowels || localPart).slice(0, 4).toUpperCase();
  } else {
    initial = "ADM";
  }
  return `${role} - ${initial}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { content, conversationId } = await request.json();

    if (!content || !conversationId) {
      return ApiResponse.error("Content and conversationId are required", 400);
    }

    let adminId = (session.user as any).id;
    if (!adminId && session.user.email) {
      const adminUser = await prisma.user.findFirst({
        where: {
          email: session.user.email,
          role: { name: { in: ["ADMIN", "Admin"] } },
        },
        select: { id: true },
      });
      if (adminUser) adminId = adminUser.id;
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderEmail: session.user.email,
        senderId: adminId || null,
        conversationId,
        isAdmin: true,
        status: 'SENT',
      },
      include: {
        user: { 
          select: { 
            name: true, 
            email: true,
            role: { select: { name: true } },
            UserImage: { select: { imageUrl: true } }
          } 
        },
        conversation: { select: { adminAlias: true } }
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    const senderName = message.conversation?.adminAlias 
       ? `Admin - ${message.conversation.adminAlias}`
       : formatAdminSender(message.user?.role?.name, message.user?.name, message.user?.email || session.user.email);

    const pusherMessage = {
      ...message,
      senderRole: "admin",
      sender: { 
        name: senderName,
        imageUrl: message.user?.UserImage?.imageUrl || null
      }
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
