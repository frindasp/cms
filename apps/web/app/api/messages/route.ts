import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

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

    const message = {
      id: Math.random().toString(36).substring(7),
      content,
      senderId: (session.user as any).id,
      sender: {
        name: session.user.name,
      },
      createdAt: new Date().toISOString(),
    };

    await pusherServer.trigger(channel, "new-message", message);

    return ApiResponse.success({ data: message });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return ApiResponse.internalError(error);
  }
}
