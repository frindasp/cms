import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { prisma } from "@workspace/database";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          conversation: { select: { title: true } }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.count(),
    ]);

    const normalizedMessages = messages.map((m: (typeof messages)[number]) => ({
      ...m,
      sender: {
         name: m.isAdmin 
           ? `Admin - ${m.user?.name || "Support"}` 
           : (m.user?.name || m.senderEmail),
      },
    }));

    return ApiResponse.success({
      data: normalizedMessages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  try {
    const { content, channel = "chat-room" } = await request.json();

    if (!content) {
      return ApiResponse.error("Content is required", 400);
    }

    const savedMessage = await prisma.message.create({
      data: {
        content,
        senderId: (session.user as any).id,
        senderEmail: session.user.email,
        isAdmin: true,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    const message = {
      id: savedMessage.id,
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      senderRole: "admin",
      sender: {
         name: `Admin - ${savedMessage.user?.name || session.user.name || "Support"}`,
      },
      createdAt: savedMessage.createdAt.toISOString(),
    };

    await pusherServer.trigger(channel, "new-message", message);

    return ApiResponse.success({ data: message });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return ApiResponse.internalError(error);
  }
}
