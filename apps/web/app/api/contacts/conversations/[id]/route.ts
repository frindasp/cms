import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return ApiResponse.error("Only admins can update conversation titles", 401);
  }

  try {
    const { title, userAlias, adminAlias } = await request.json();
    const { id } = await params;

    if (!id) return ApiResponse.error("Conversation ID is required", 400);

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { 
        title: title !== undefined ? title : undefined,
        userAlias: userAlias !== undefined ? userAlias : undefined,
        adminAlias: adminAlias !== undefined ? adminAlias : undefined,
      },
    });

    await logActivity({
      userId: session.user.id,
      action: "UPDATE_CONVERSATION_TITLE",
      description: `Updated conversation title for ${conversation.email} to: ${title || "Default"}`,
      route: `/api/contacts/conversations/${id}`,
      method: "PATCH",
    });

    return ApiResponse.success({ data: conversation });
  } catch (error: any) {
    console.error("Update title error:", error);
    return ApiResponse.internalError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    const currentUserId = (session.user as any).id;

    // Update per-admin read state
    await prisma.conversationReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: currentUserId,
        }
      },
      update: { lastReadAt: new Date(), isRead: true },
      create: {
        conversationId: id,
        userId: currentUserId,
        lastReadAt: new Date(),
        isRead: true,
      }
    });

    // Still update the legacy isRead for backward compatibility with User view
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        isAdmin: false,
        isRead: false,
      },
      data: { isRead: true },
    });

    return ApiResponse.success({ success: true });
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return ApiResponse.internalError(error);
  }
}

// PUT: Toggle conversation state (pin, favorite, archive, mute, read)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    const currentUserId = (session.user as any).id;
    const body = await request.json();

    const updateData: Record<string, boolean> = {};
    if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
    if (body.isMuted !== undefined) updateData.isMuted = body.isMuted;
    if (body.isRead !== undefined) updateData.isRead = body.isRead;

    await prisma.conversationReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: currentUserId,
        }
      },
      update: updateData,
      create: {
        conversationId: id,
        userId: currentUserId,
        ...updateData,
      }
    });

    return ApiResponse.success({ success: true });
  } catch (error: any) {
    console.error("Toggle state error:", error);
    return ApiResponse.internalError(error);
  }
}

// DELETE: Delete entire conversation or clear messages
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const clearOnly = url.searchParams.get("clear") === "true";

    if (clearOnly) {
      // Just clear messages
      await prisma.message.deleteMany({ where: { conversationId: id } });
    } else {
      // Full delete
      await prisma.conversationReadState.deleteMany({ where: { conversationId: id } });
      await prisma.message.deleteMany({ where: { conversationId: id } });
      await prisma.conversation.delete({ where: { id } });
    }

    return ApiResponse.success({ success: true });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    return ApiResponse.internalError(error);
  }
}
