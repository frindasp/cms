import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import mysql from 'mysql2/promise';
import pg from 'pg';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  const config = await prisma.backupConfig.findUnique({
    where: { id },
  });

  if (!config) return ApiResponse.error("Configuration not found", 404);

  try {
    let schemaList: any[] = [];

    switch (config.databaseType) {
      case "TIDB":
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          ssl: mysqlOptions.ssl || undefined,
        });
        
        const [rows]: any = await mysqlConn.query(`
          SELECT 
            SCHEMA_NAME as name,
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = SCHEMA_NAME) as tableCount,
            (SELECT SUM(DATA_LENGTH + INDEX_LENGTH) FROM information_schema.tables WHERE table_schema = SCHEMA_NAME) as sizeBytes
          FROM information_schema.schemata
          WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
          ORDER BY SCHEMA_NAME ASC
        `);
        
        schemaList = rows.map((row: any) => ({
          name: row.name,
          tableCount: Number(row.tableCount || 0),
          sizeBytes: Number(row.sizeBytes || 0),
        }));
        await mysqlConn.end();
        break;

      case "SUPABASE":
        const pgOptions = (config.options as any) || {};
        let ssl: any = { rejectUnauthorized: false };
        if (pgOptions.ssl) {
          ssl = { ...pgOptions.ssl };
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
          database: config.databaseName.split('/')[0] || config.databaseName,
          ssl: ssl,
        });
        await pgClient.connect();
        const res = await pgClient.query(`
          SELECT 
              n.nspname AS "name",
              COUNT(c.relname) AS "tableCount",
              COALESCE(SUM(pg_total_relation_size(c.oid)), 0) AS "sizeBytes"
          FROM pg_namespace n
          LEFT JOIN pg_class c ON n.oid = c.relnamespace AND c.relkind IN ('r', 'p')
          WHERE n.nspname NOT IN ('information_schema') AND n.nspname NOT LIKE 'pg_%'
          GROUP BY n.nspname
          ORDER BY n.nspname ASC;
        `);
        schemaList = res.rows.map((row: { name: string; tableCount: string | number; sizeBytes: string | number | null }) => ({
          name: row.name,
          tableCount: Number(row.tableCount || 0),
          sizeBytes: Number(row.sizeBytes || 0),
        }));
        await pgClient.end();
        break;

       default:
        return ApiResponse.error(`Schema fetching not implemented for ${config.databaseType}`, 400);
    }

    return ApiResponse.success({ data: schemaList });
  } catch (error: any) {
    return ApiResponse.error(`Failed to fetch schemas: ${error.message}`, 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const schemaName = searchParams.get("name");

  if (!schemaName) {
    return ApiResponse.error("Schema name is required", 400);
  }

  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  const config = await prisma.backupConfig.findUnique({
    where: { id },
  });

  if (!config) return ApiResponse.error("Configuration not found", 404);

  try {
    switch (config.databaseType) {
      case "TIDB":
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          ssl: mysqlOptions.ssl || undefined,
        });
        
        await mysqlConn.execute(`DROP DATABASE \`${schemaName}\``);
        await mysqlConn.end();
        break;

      case "SUPABASE":
        const pgOptions = (config.options as any) || {};
        let ssl: any = { rejectUnauthorized: false };
        if (pgOptions.ssl) {
          ssl = { ...pgOptions.ssl };
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
          database: config.databaseName.split('/')[0] || config.databaseName,
          ssl: ssl,
        });
        await pgClient.connect();
        await pgClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await pgClient.end();
        break;
    }

    await logActivity({
      userId: session.user?.id,
      action: "DROP_SCHEMA",
      description: `Dropped schema ${schemaName} on ${config.host}`,
      route: `/api/backup/${id}/schemas`,
      method: "DELETE",
      metadata: { configId: id, schemaName }
    });

    return ApiResponse.success({ message: `Schema ${schemaName} dropped successfully` });
  } catch (error: any) {
    return ApiResponse.error(`Failed to drop schema: ${error.message}`, 400);
  }
}
