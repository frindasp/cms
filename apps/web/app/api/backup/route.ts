import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const data = await prisma.backupConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Serialize BigInt for JSON safety
    const result = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return ApiResponse.success(result);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const body = await request.json();
    const data = await prisma.backupConfig.create({
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
      action: "CREATE_BACKUP_CONFIG",
      description: `Created backup configuration ${data.name}`,
      route: "/api/backup",
      method: "POST",
      metadata: { targetId: data.id }
    });

    return ApiResponse.success(result, 201);
  } catch (error) {
    return ApiResponse.internalError(error);
  }
}
