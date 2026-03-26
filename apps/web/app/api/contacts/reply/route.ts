import { prisma } from "@workspace/database";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return ApiResponse.unauthorized();
  }

  try {
    const { email, content } = await request.json();

    if (!email || !content) {
      return ApiResponse.error("Email and content are required", 400);
    }

    // Store admin reply as a message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: (session.user as any).id,
        senderName: session.user.name,
        channelId: email,
        senderRole: "admin",
      },
    });

    const pusherMessage = {
      id: message.id,
      content,
      senderId: (session.user as any).id,
      sender: {
        name: session.user.name,
      },
      senderRole: "admin",
      createdAt: message.createdAt,
    };

    // Trigger on the specific conversation channel
    const channelName = `conversation-${email.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "")}`;
    await pusherServer.trigger(channelName, "new-message", pusherMessage);

    // Also trigger on the global chat room as a general update
    await pusherServer.trigger("chat-room", "new-message", {
       ...pusherMessage,
       content: `Admin replied to ${email}: ${content}`,
       senderId: "system",
       sender: { name: "System" }
    });

    return ApiResponse.success({ data: message });
  } catch (error) {
    console.error("Reply error:", error);
    return ApiResponse.internalError(error);
  }
}
