import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return ApiResponse.error("Role name is required", 400);
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    return ApiResponse.success(role);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return ApiResponse.error("Role name already exists", 400);
    }
    return ApiResponse.internalError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const { id } = await params;

    const usersCount = await prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0) {
      return ApiResponse.error("Role is still assigned to users", 400);
    }

    await prisma.role.delete({ where: { id } });

    return ApiResponse.success({ success: true });
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
