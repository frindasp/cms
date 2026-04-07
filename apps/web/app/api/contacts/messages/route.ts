import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email") || searchParams.get("channelId");

  try {
    let messages: any[] = [];
    let contacts: any[] = [];

    if (id) {
      // 1. Fetch by Conversation ID
      messages = await prisma.message.findMany({
        where: { conversationId: id },
        include: {
          user: { include: { role: true } },
          contact: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: { email: true }
      });

      if (conversation) {
        contacts = await prisma.contact.findMany({
          where: { email: conversation.email },
          orderBy: { createdAt: "asc" },
        });
      }
    } else if (email) {
      // 2. Legacy/Fallback: Fetch by Email
      const userContacts = await prisma.contact.findMany({
        where: { email },
        select: { id: true }
      });
      const contactIds = userContacts.map(c => c.id);

      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderEmail: email },
            { contactId: { in: contactIds } }
          ]
        },
        include: {
          user: { include: { role: true } },
          contact: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      contacts = await prisma.contact.findMany({
        where: { email },
        orderBy: { createdAt: "asc" },
      });
    } else {
      return ApiResponse.error("id or email is required", 400);
    }



    const normalizedMessages = messages.map((m: any) => {
      const roleName = m.user?.role?.name;
      return {
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderRole: m.isAdmin ? "admin" : "user",
        sender: {
          name: m.isAdmin 
            ? `Admin - ${m.user?.name || "Support"}` 
            : `${m.contact?.name || m.user?.name || m.senderEmail}${roleName ? ` (${roleName})` : ""}`,
        },
        createdAt: m.createdAt,
      };
    });

    const normalizedContacts = contacts.map((c: (typeof contacts)[number]) => ({
      id: c.id,
      content: c.message,
      senderId: c.email,
      senderRole: "user" as const,
      sender: {
        name: c.name,
      },
      createdAt: c.createdAt,
    }));

    const timeline = [...normalizedContacts, ...normalizedMessages]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return ApiResponse.success({
      data: timeline,
    });
  } catch (error: any) {
    console.error("Messages fetch error:", error);
    return ApiResponse.internalError(error);
  }
}
