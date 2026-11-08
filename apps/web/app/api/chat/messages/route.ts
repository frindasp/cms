import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

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
        user: { 
          select: { 
            name: true, 
            email: true,
            role: { select: { name: true } },
            UserImage: { select: { imageUrl: true } }
          } 
        },
        conversation: { select: { title: true, userAlias: true, adminAlias: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const normalizedMessages = messages.map(m => {
        const isSenderAdmin = m.isAdmin;
        let senderName = m.user?.name || m.senderEmail || "Guest";
        
        if (isSenderAdmin) {
          if (m.conversation?.adminAlias) {
            senderName = `Admin - ${m.conversation.adminAlias}`;
          } else {
            senderName = formatAdminSender(m.user?.role?.name, m.user?.name, m.user?.email || m.senderEmail);
          }
        } else {
          senderName = m.conversation?.userAlias || m.user?.name || "User";
        }
        
        return {
          ...m,
          senderRole: isSenderAdmin ? "admin" : "user",
          sender: { 
            name: senderName,
            imageUrl: m.user?.UserImage?.imageUrl || null
          }
        };
    });

    return ApiResponse.success({ data: normalizedMessages });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
