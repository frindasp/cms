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
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const data = await prisma.backupConfig.findUnique({
      where: { id },
      include: { 
        backups: { 
          orderBy: { createdAt: "desc" },
          take: 20
        } 
      }
    });

    if (!data) {
      return ApiResponse.error("Backup configuration not found", 404);
    }

    // Serialize BigInt for JSON safety
    const result = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return ApiResponse.success(result);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const body = await request.json();
    const data = await prisma.backupConfig.update({
      where: { id },
      data: {
        name: body.name,
        databaseType: body.databaseType,
        host: body.host,
        port: body.port,
        databaseName: body.databaseName,
        username: body.username,
        password: body.password,
        options: body.options || null,
      },
    });

    // Serialize BigInt for JSON safety
    const result = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    await logActivity({
      userId: session.user?.id,
      action: "UPDATE_BACKUP_CONFIG",
      description: `Updated backup configuration ${data.name}`,
      route: `/api/backup/${id}`,
      method: "PATCH",
      metadata: { targetId: data.id }
    });


    return ApiResponse.success(result);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const data = await prisma.backupConfig.delete({
      where: { id },
    });

    await logActivity({
      userId: session.user?.id,
      action: "DELETE_BACKUP_CONFIG",
      description: `Deleted backup configuration ${data.name}`,
      route: `/api/backup/${id}`,
      method: "DELETE",
      metadata: { targetId: data.id }
    });


    return ApiResponse.success(data);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
