import { prisma } from "@workspace/database"
import { auth } from "@/auth"
import { ApiResponse } from "@/lib/api-response"
import { logActivity } from "@/lib/activity-log"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const targetDbName = searchParams.get("name")

  if (!targetDbName) {
    return ApiResponse.error("Target database name is required", 400)
  }

  const session = await auth()
  if (!session) return ApiResponse.unauthorized()

  try {
    const sourceConfig = await prisma.backupConfig.findUnique({
      where: { id },
    })

    if (!sourceConfig) {
      return ApiResponse.error("Source configuration not found", 404)
    }

    // Check if a config with same host and target database name already exists
    let targetConfig = await prisma.backupConfig.findFirst({
      where: {
        host: sourceConfig.host,
        databaseName: targetDbName,
      },
    })

    if (!targetConfig) {
      // Create new config based on source but with new database name
      targetConfig = await prisma.backupConfig.create({
        data: {
          name: `${sourceConfig.name} (${targetDbName})`,
          databaseType: sourceConfig.databaseType,
          host: sourceConfig.host,
          port: sourceConfig.port,
          databaseName: targetDbName,
          username: sourceConfig.username,
          password: sourceConfig.password,
          options: sourceConfig.options as any,
        },
      })

      await logActivity({
        userId: session.user?.id,
        action: "CREATE_BACKUP_CONFIG_SWITCH",
        description: `Created new backup configuration ${targetConfig.name} via schema switch`,
        route: `/api/backup/${id}/switch`,
        method: "POST",
        metadata: { sourceId: id, targetId: targetConfig.id },
      })
    }

    return ApiResponse.success({ data: targetConfig })
  } catch (error: any) {
    return ApiResponse.internalError(error)
  }
}
