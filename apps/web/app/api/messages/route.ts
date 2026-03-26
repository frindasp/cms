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

    const [data, total] = await Promise.all([
      prisma.message.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.count(),
    ]);

    return ApiResponse.success({
      data,
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
        senderName: session.user.name,
        channelId: channel,
        senderRole: "admin",
      },
    });

    const message = {
      id: savedMessage.id,
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      senderRole: savedMessage.senderRole,
      sender: {
        name: savedMessage.senderName,
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
