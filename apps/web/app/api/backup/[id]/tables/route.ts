import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import mysql from 'mysql2/promise';
import pg from 'pg';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetDbName = searchParams.get("name") || null;

  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  const config = await prisma.backupConfig.findUnique({
    where: { id },
  });

  if (!config) return ApiResponse.error("Configuration not found", 404);

  try {
    let tableList: any[] = [];

    switch (config.databaseType) {
      case "TIDB": {
        const mysql = await import('mysql2/promise');
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.default.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.databaseName,
          ssl: mysqlOptions.ssl || undefined,
        });
        const [rows]: any = await mysqlConn.query(`SHOW TABLES FROM \`${config.databaseName}\``);
        tableList = rows.map((row: any) => ({
          name: Object.values(row)[0] as string,
          rowCount: 0,
          sizeBytes: 0,
          createdAt: null,
          description: null,
        }));
        await mysqlConn.end();
        break;
      }
      case "SUPABASE": {
        const pgOptions = (config.options as any) || {};
        let ssl: any = false;
        if (pgOptions.ssl) {
          ssl = { rejectUnauthorized: false };
        }
        const pg = await import('pg');
        
        let dbName = config.databaseName;
        let defaultSchema = 'public';
        if (dbName.includes('/')) {
          const parts = dbName.split('/');
          dbName = parts[0] || dbName;
          defaultSchema = parts[1] || 'public';
        }

        const targetSchema = targetDbName || defaultSchema;
        const pgClient = new pg.default.Client({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: dbName,
          ssl: ssl,
        });
        await pgClient.connect();
        const res = await pgClient.query(`
          SELECT 
            table_name as "name",
            (SELECT reltuples FROM pg_class WHERE relname = table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $1 LIMIT 1) AND relkind IN ('r', 'p') LIMIT 1) as "rowCount",
            pg_total_relation_size(quote_ident($1) || '.' || quote_ident(table_name)) as "sizeBytes"
          FROM information_schema.tables 
          WHERE table_schema = $1
          ORDER BY table_name ASC
        `, [targetSchema]);
        tableList = res.rows.map((row: any) => ({
          name: row.name,
          rowCount: Number(row.rowCount || 0),
          sizeBytes: Number(row.sizeBytes || 0),
          createdAt: null,
          description: null,
        }));
        await pgClient.end();
        break;
      }
      default:
        return ApiResponse.error(`Table fetching not implemented for ${config.databaseType}`, 400);
    }

    return ApiResponse.success({ data: tableList });
  } catch (error: any) {
    return ApiResponse.error(`Failed to fetch tables: ${error.message}`, 400);
  }
}
