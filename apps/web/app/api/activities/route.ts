import { NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const where = userId ? { userId } : {};
    
    const [activities, total] = await Promise.all([
      prisma.historyActivityUser.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.historyActivityUser.count({ where }),
    ]);

    return NextResponse.json({
      data: activities,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
