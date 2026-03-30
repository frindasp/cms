import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    await prisma.verificationToken.delete({
      where: { id },
    });
    return ApiResponse.success({ message: "Token deleted successfully" });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
