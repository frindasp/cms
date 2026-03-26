import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return ApiResponse.error("Email is required", 400);
  }
  try {
    // Fetch all messages for this conversation (channelId)
    const messages = await prisma.message.findMany({
      where: { channelId: email },
      orderBy: { createdAt: "asc" },
    });

    if (messages.length > 0) {
      return ApiResponse.success({
        data: messages.map((m: (typeof messages)[number]) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          senderRole: m.senderRole,
          sender: {
            name: m.senderName,
          },
          createdAt: m.createdAt,
        })),
      });
    }

    // Fallback: If no Message records exist yet, show the Contact form submissions as messages
    const contacts = await prisma.contact.findMany({
      where: { email },
      orderBy: { createdAt: "asc" },
    });
    
    return ApiResponse.success({
      data: contacts.map((m: (typeof contacts)[number]) => ({
        id: m.id,
        content: m.message,
        senderId: m.email,
        senderRole: "user",
        sender: {
          name: m.name,
        },
        createdAt: m.createdAt,
      })),
    });

    return ApiResponse.success({ data: [] });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
