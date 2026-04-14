import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import mysql from 'mysql2/promise';
import pg from 'pg';
import * as couchbase from 'couchbase';

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

  const dbToQuery = targetDbName || config.databaseName;

  try {
    let tableList: any[] = [];

    switch (config.databaseType) {
      case "MYSQL":
      case "TIDB":
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: dbToQuery,
          ssl: mysqlOptions.ssl || undefined,
        });
        
        const [rows]: any = await mysqlConn.query(`
          SELECT 
            TABLE_NAME as name,
            TABLE_ROWS as rowCount,
            DATA_LENGTH as dataSize,
            INDEX_LENGTH as indexSize,
            CREATE_TIME as createdAt,
            TABLE_COMMENT as description
          FROM information_schema.tables 
          WHERE TABLE_SCHEMA = ?
          ORDER BY TABLE_NAME ASC
        `, [dbToQuery]);
        
        tableList = rows.map((row: any) => ({
          name: row.name,
          rowCount: Number(row.rowCount || 0),
          sizeBytes: Number(row.dataSize || 0) + Number(row.indexSize || 0),
          createdAt: row.createdAt,
          description: row.description || null,
        }));
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
          database: dbToQuery,
          ssl: ssl,
        });
        await pgClient.connect();
        const res = await pgClient.query(`
          SELECT 
            table_name as "name",
            (SELECT reltuples FROM pg_class WHERE relname = table_name AND relkind = 'r' LIMIT 1) as "rowCount",
            pg_total_relation_size(quote_ident(table_name)) as "sizeBytes"
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name ASC
        `);
        tableList = res.rows.map((row: any) => ({
          name: row.name,
          rowCount: Number(row.rowCount || 0),
          sizeBytes: Number(row.sizeBytes || 0),
          createdAt: null,
          description: null,
        }));
        await pgClient.end();
        break;

      case "COUCHBASE":
        const cbOptions = config.options as any;
        const protocol = cbOptions?.protocol || (config.host.includes("cloud.couchbase.com") ? "couchbases" : "couchbase");
        const clusterConnStr = config.host.includes("://") ? config.host : `${protocol}://${config.host}`;
        
        const cluster = await couchbase.connect(clusterConnStr, {
          username: config.username,
          password: config.password,
          configProfile: cbOptions?.configProfile || "wanDevelopment",
        });
        
        const bucket = cluster.bucket(dbToQuery);
        const scopes = await bucket.collections().getAllScopes();
        
        tableList = scopes.flatMap(scope => 
          scope.collections.map(col => ({
            name: `${scope.name}.${col.name}`,
            rowCount: undefined,
            sizeBytes: undefined,
            createdAt: null,
            description: `Collection in scope ${scope.name}`,
          }))
        );
        
        await cluster.close();
        break;
    }

    return ApiResponse.success({ data: tableList });
  } catch (error: any) {
    return ApiResponse.error(`Failed to fetch tables: ${error.message}`, 400);
  }
}
