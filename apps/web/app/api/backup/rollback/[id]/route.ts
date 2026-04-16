import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import mysql from 'mysql2/promise';

export async function POST(
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
    return ApiResponse.error("Backup log not found or backup was not successful", 404);
  }

  const config = log.backupConfig;

  try {
    if (config.databaseType === "TIDB") {
      const mysqlOptions = (config.options as any) || {};
      const mysqlConn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        ssl: mysqlOptions.ssl || undefined,
      });

      // Extract schema name from fileName or logic
      // In our execute route, fileName is {dbName}_{YYYYMMDD}.sql
      const schemaName = log.fileName?.replace('.sql', '');
      
      if (schemaName && schemaName !== config.databaseName) {
        // DROP the created database
        await mysqlConn.query(`DROP DATABASE IF EXISTS \`${schemaName}\``);
        
        // Update log status to reflect rollback
        await prisma.backupLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            error: "Rollback: This snapshot has been deleted by the user.",
          }
        });

        await mysqlConn.end();
        return ApiResponse.success({ message: `Rollback successful. Schema \`${schemaName}\` has been deleted.` });
      }
      
      await mysqlConn.end();
    }

    return ApiResponse.error("Rollback not supported for this database type or configuration", 400);
  } catch (error: any) {
    return ApiResponse.error(`Rollback failed: ${error.message}`, 400);
  }
}
