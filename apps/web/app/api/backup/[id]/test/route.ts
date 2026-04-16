import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

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
      case "TIDB":
        const mysql = await import('mysql2/promise');
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.default.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          ssl: mysqlOptions.ssl || undefined,
          connectTimeout: 10000,
        });
        await mysqlConn.ping();
        message = "Successfully connected to TiDB database.";
        await mysqlConn.end();
        break;

      case "SUPABASE":
        const pgOptions = (config.options as any) || {};
        let ssl: any = false;
        
        if (config.databaseType === "SUPABASE" || pgOptions.ssl) {
          ssl = pgOptions.ssl ? { ...pgOptions.ssl } : { rejectUnauthorized: false };
          
          if (ssl.ca && typeof ssl.ca === 'string' && ssl.ca.includes('.crt')) {
            try {
              const fs = await import('fs/promises');
              const path = await import('path');
              
              const localPath = path.join(process.cwd(), ssl.ca);
              const rootPath = path.join(process.cwd(), "..", "..", ssl.ca);
              
              let finalPath = localPath;
              try {
                await fs.access(localPath);
              } catch {
                try {
                  await fs.access(rootPath);
                  finalPath = rootPath;
                } catch {
                   // Fallback to original path if both fail, will error in readFile
                }
              }

              ssl.ca = await fs.readFile(finalPath, 'utf8');
            } catch (err) {
              console.error("Failed to read SSL CA file:", err);
            }
          }
        }

        const pg = await import('pg');
        const { Client } = pg.default;
        const pgClient = new Client({
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

      default:
        return ApiResponse.error(`Connection testing not implemented for ${config.databaseType}`, 400);
    }

    return ApiResponse.success({ message });
  } catch (error: any) {
    console.error("Connection Test Error:", error);
    return ApiResponse.error(`Connection failed: ${error.message}`, 400);
  }
}
