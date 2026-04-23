import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return ApiResponse.unauthorized();

  try {
    const { isOnline } = await request.json();
    const userId = (session.user as any).id;

    const lastSeen = new Date();
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isOnline,
        lastSeen,
      },
    });

    await pusherServer.trigger("user-status", "status-changed", {
      userId,
      isOnline,
      lastSeen: lastSeen.toISOString(),
    });

    return ApiResponse.success({ data: { isOnline, lastSeen } });
  } catch (error) {
    console.error("User status error:", error);
    return ApiResponse.internalError(error);
  }
}
