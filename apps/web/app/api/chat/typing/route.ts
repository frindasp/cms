import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { conversationId, isTyping } = await request.json();

    if (!conversationId) {
      return ApiResponse.error("conversationId is required", 400);
    }

    const event = isTyping ? "user-typing" : "user-stop-typing";
    const data = {
      userId: (session.user as any).id,
      userName: session.user.name || session.user.email,
      conversationId,
    };

    await pusherServer.trigger(`conversation-${conversationId}`, event, data);

    return ApiResponse.success({ data });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
