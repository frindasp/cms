import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import mysql from 'mysql2/promise';
import pg from 'pg';
import * as couchbase from 'couchbase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return ApiResponse.unauthorized();

  try {
    const config = await prisma.backupConfig.findUnique({
      where: { id },
    });

    if (!config) return ApiResponse.error("Backup configuration not found", 404);

    let message = "";

    switch (config.databaseType) {
      case "MYSQL":
      case "TIDB":
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          ssl: mysqlOptions.ssl || undefined,
          connectTimeout: 10000,
        });
        await mysqlConn.ping();
        message = "Successfully connected to TiDB/MySQL database.";
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
            try {
              const fs = await import('fs/promises');
              const path = await import('path');
              ssl.ca = await fs.readFile(path.join(process.cwd(), ssl.ca), 'utf8');
            } catch (err) {
              console.error("Failed to read SSL CA file:", err);
            }
          }
        }

        const pgClient = new pg.Client({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.databaseName,
          ssl: ssl,
          connectionTimeoutMillis: 10000,
        });
        await pgClient.connect();
        await pgClient.query("SELECT 1");
        message = `Successfully connected to ${config.databaseType} database.`;
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
        
        await cluster.ping();
        message = "Successfully connected to Couchbase cluster.";
        await cluster.close();
        break;

      default:
        return ApiResponse.error(`Connection testing not implemented for ${config.databaseType}`, 400);
    }

    return ApiResponse.success({ message });
  } catch (error: any) {
    console.error("Connection Test Error:", error);
    return ApiResponse.error(`Connection failed: ${error.message}`, 400);
  }
}
