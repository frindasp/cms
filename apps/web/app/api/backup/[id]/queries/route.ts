import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const queries = await prisma.backupQuery.findMany({
      where: { backupConfigId: id },
      orderBy: { updatedAt: "desc" },
    });

    return ApiResponse.success({ data: queries });
  } catch (error: any) {
    return ApiResponse.internalError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const body = await request.json();
    const query = await prisma.backupQuery.create({
      data: {
        name: body.name,
        description: body.description,
        sql: body.sql,
        schemaName: body.schemaName, // New field
        backupConfigId: id,
      },
    });

    await logActivity({
      userId: session.user?.id,
      action: "CREATE_BACKUP_QUERY",
      description: `Created SQL script ${query.name}`,
      route: `/api/backup/${id}/queries`,
      method: "POST",
      metadata: { configId: id, queryId: query.id }
    });

    return ApiResponse.success({ data: query }, 201);
  } catch (error: any) {
    return ApiResponse.internalError(error);
  }
}
