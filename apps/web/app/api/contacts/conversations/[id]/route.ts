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
      update: { lastReadAt: new Date() },
      create: {
        conversationId: id,
        userId: currentUserId,
        lastReadAt: new Date(),
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
