import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import mysql from 'mysql2/promise';
import pg from 'pg';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const { sql } = await request.json();
    if (!sql) return ApiResponse.error("SQL query is required", 400);

    const config = await prisma.backupConfig.findUnique({
      where: { id },
    });

    if (!config) return ApiResponse.error("Configuration not found", 404);

    let result: any = null;

    switch (config.databaseType) {
      case "MYSQL":
      case "TIDB":
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.databaseName,
          ssl: mysqlOptions.ssl || undefined,
          multipleStatements: true
        });
        
        const [rows]: any = await mysqlConn.query(sql);
        result = rows;
        await mysqlConn.end();
        break;

      case "POSTGRESQL":
      case "SUPABASE":
      case "YUGABYTE":
        const pgOptions = (config.options as any) || {};
        let ssl: any = false;
        if (config.databaseType === "SUPABASE" || pgOptions.ssl) {
          ssl = pgOptions.ssl ? { ...pgOptions.ssl } : { rejectUnauthorized: false };
          if (ssl.ca && typeof ssl.ca === 'string' && ssl.ca.includes('.crt')) {
            const fs = await import('fs/promises');
            const path = await import('path');
            ssl.ca = await fs.readFile(path.join(process.cwd(), ssl.ca), 'utf8');
          }
        }
        const pgClient = new pg.Client({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.databaseName,
          ssl: ssl,
        });
        await pgClient.connect();
        const pgRes = await pgClient.query(sql);
        result = pgRes.rows;
        await pgClient.end();
        break;
      
      default:
        return ApiResponse.error(`Execution not supported for ${config.databaseType}`, 400);
    }

    await logActivity({
      userId: session.user?.id,
      action: "EXECUTE_RAW_SQL",
      description: `Executed raw SQL on ${config.databaseName}`,
      route: `/api/backup/${id}/queries/execute`,
      method: "POST",
      metadata: { configId: id, sqlPreview: sql.substring(0, 100) }
    });

    return ApiResponse.success({ data: result });
  } catch (error: any) {
    return ApiResponse.error(`Query execution failed: ${error.message}`, 400);
  }
}
