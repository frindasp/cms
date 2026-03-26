import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET() {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  const roles = await prisma.role.findMany();
  return ApiResponse.success(roles);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return ApiResponse.error("Role name is required", 400);
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
      },
    });

    return ApiResponse.success(role, 201);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return ApiResponse.error("Role name already exists", 400);
    }
    return ApiResponse.internalError(error);
  }
}
