import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  // Conversation identity uses channelId in Message table.
  // For contact-form compatibility, channelId currently equals user email.
  const channelId = searchParams.get("channelId") ?? searchParams.get("email");

  if (!channelId) {
    return ApiResponse.error("channelId is required", 400);
  }
  try {
    // Fetch all chat records for this conversation channel.
    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    });

    // Keep contact history too, so timeline remains complete
    const contacts = await prisma.contact.findMany({
      where: { email: channelId },
      orderBy: { createdAt: "asc" },
    });

    const normalizedMessages = messages.map((m: (typeof messages)[number]) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderRole: m.senderRole,
      sender: {
        name: m.senderName,
      },
      createdAt: m.createdAt,
    }));

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
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
