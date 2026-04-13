import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  const log = await prisma.backupLog.findUnique({
    where: { id },
    include: { backupConfig: true }
  });

  if (!log || log.status !== "SUCCESS") {
    return ApiResponse.error("Backup file not found or backup failed", 404);
  }

  const fileName = log.fileName || "backup.sql";
  const dummyContent = `-- Backup for ${log.backupConfig.name}
-- Generated at: ${log.createdAt.toISOString()}
-- Database: ${log.backupConfig.databaseName}
-- Host: ${log.backupConfig.host}

-- [DUMMY DATA]
-- This is a simulated backup file produced by Frindasp CMS.
-- In a production environment, this would contain the actual SQL dump.
`;

  return new Response(dummyContent, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
