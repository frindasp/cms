import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import * as bcrypt from "bcryptjs";
import { ApiResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  // Remove passwords from response
  const sanitizedData = data.map(({ password, ...user }: any) => user);

  return ApiResponse.success({
    data: sanitizedData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const body = await request.json();
    const { name, email, password, roleId } = body;

    if (!email || !password || !roleId) {
      return ApiResponse.error("Missing fields", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ApiResponse.error("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId,
      },
      include: { role: true },
    });

    const { password: _, ...sanitizedUser } = user;
    return ApiResponse.success(sanitizedUser, 201);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
