import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    const authenticators = await prisma.authenticator.findMany({
      where: { userId: id },
      orderBy: { id: "asc" }, // Or any other field
    });

    return ApiResponse.success(authenticators);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  // Note: This ID would be the Authenticator ID, but this route is /[userId]/authenticators
  // Maybe I should create a separate route for deleting specific authenticator.
  // But for now, let's just implement GET here.
  return ApiResponse.error("Method not allowed", 405);
}
