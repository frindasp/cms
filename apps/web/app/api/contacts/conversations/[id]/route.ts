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
    const { title } = await request.json();
    const { id } = await params;

    if (!id) return ApiResponse.error("Conversation ID is required", 400);

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { title },
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
