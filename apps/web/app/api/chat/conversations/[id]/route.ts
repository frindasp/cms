import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();
  
  try {
    const { id } = await params;
    const adminId = (session.user as any).id;
    await prisma.conversationReadState.upsert({
      where: { conversationId_userId: { conversationId: id, userId: adminId } },
      update: { isRead: true },
      create: { conversationId: id, userId: adminId, isRead: true }
    });

    // Also update all messages in this conversation to READ
    await prisma.message.updateMany({
      where: { conversationId: id, status: { not: 'READ' } },
      data: { status: 'READ', isRead: true }
    });

    // Trigger Pusher notification for the recipient
    const { pusherServer } = await import("@/lib/pusher");
    await pusherServer.trigger(`conversation-${id}`, "conversation-status-updated", {
      conversationId: id,
      status: "READ",
    });

    return ApiResponse.success({ message: "Marked as read" });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();
  
  try {
    const { id } = await params;
    const adminId = (session.user as any).id;
    const body = await request.json();
    
    await prisma.conversationReadState.upsert({
      where: { conversationId_userId: { conversationId: id, userId: adminId } },
      update: body,
      create: { conversationId: id, userId: adminId, ...body }
    });
    
    return ApiResponse.success({ message: "State toggled" });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    await prisma.conversation.update({
      where: { id: id },
      data: body
    });
    
    return ApiResponse.success({ message: "Conversation fields updated" });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();
  
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const clear = searchParams.get("clear");
    
    if (clear === 'true') {
      await prisma.message.deleteMany({
        where: { conversationId: id }
      });
      return ApiResponse.success({ message: "Messages cleared" });
    }
    
    await prisma.conversationReadState.deleteMany({
      where: { conversationId: id }
    });
    await prisma.message.deleteMany({
      where: { conversationId: id }
    });
    await prisma.conversation.delete({
      where: { id: id }
    });
    
    return ApiResponse.success({ message: "Conversation deleted" });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
