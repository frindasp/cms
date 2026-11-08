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

    // Fallback: If an admin message has no senderId/user attached, find the admin user by senderEmail
    const adminEmailsToLookup = Array.from(
      new Set(
        messages
          .filter(m => m.isAdmin && !m.user && m.senderEmail)
          .map(m => m.senderEmail as string)
      )
    );

    const adminUsersMap = new Map<string, any>();
    if (adminEmailsToLookup.length > 0) {
      const fallbackAdmins = await prisma.user.findMany({
        where: {
          email: { in: adminEmailsToLookup },
          role: { name: { in: ["ADMIN", "Admin"] } }
        },
        select: {
          name: true,
          email: true,
          role: { select: { name: true } },
          UserImage: { select: { imageUrl: true } }
        }
      });
      for (const a of fallbackAdmins) {
        adminUsersMap.set(a.email, a);
      }
    }

    const normalizedMessages = messages.map(m => {
        const isSenderAdmin = m.isAdmin;
        const msgUser = m.user || (isSenderAdmin && m.senderEmail ? adminUsersMap.get(m.senderEmail) : null);
        let senderName = msgUser?.name || m.senderEmail || "Guest";
        
        if (isSenderAdmin) {
          if (m.conversation?.adminAlias) {
            senderName = `Admin - ${m.conversation.adminAlias}`;
          } else {
            senderName = formatAdminSender(msgUser?.role?.name, msgUser?.name, msgUser?.email || m.senderEmail);
          }
        } else {
          senderName = m.conversation?.userAlias || msgUser?.name || "User";
        }
        
        return {
          ...m,
          senderRole: isSenderAdmin ? "admin" : "user",
          sender: { 
            name: senderName,
            imageUrl: msgUser?.UserImage?.imageUrl || null
          }
        };
    });

    return ApiResponse.success({ data: normalizedMessages });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
