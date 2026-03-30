import { prisma } from "@workspace/database";
import { pusherServer } from "@/lib/pusher";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return ApiResponse.error("Name, email, and message are required", 400);
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        message,
      },
    });

    // Also store as a message for two-way chat history
    await prisma.message.create({
      data: {
        content: message,
        senderId: null, // Public users don't have a user account
        senderEmail: email,
        contactId: contact.id,
        isAdmin: false,
      },
    });

    // Trigger Pusher event for real-time notification/chat
    await pusherServer.trigger("admin-notifications", "new-contact", contact);
    
    const pusherMessage = {
      id: contact.id,
      content: contact.message,
      senderId: "user-" + email,
      sender: {
        name: contact.name,
      },
      createdAt: contact.createdAt,
    };

    // Trigger on the general chat room
    await pusherServer.trigger("chat-room", "new-message", {
      ...pusherMessage,
      content: `New contact from ${name}: ${pusherMessage.content}`,
      senderId: "system",
      sender: { name: "System" },
    });

    // Trigger on the specific conversation channel
    // Using a sanitized version of email for channel name
    const channelName = `conversation-${email.replace(/[^a-zA-Z0-9_\-=@,.;]/g, "")}`;
    await pusherServer.trigger(channelName, "new-message", pusherMessage);

    return ApiResponse.success({ data: contact });
  } catch (error) {
    console.error("Contact submission error:", error);
    return ApiResponse.internalError(error);
  }
}
