import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return ApiResponse.unauthorized();
  }

  try {
    const body = await request.json();
    const { databaseType, host, port, username, password, databaseName, options } = body;

    if (!host || !username) {
      return ApiResponse.error("Host and Username are required for testing", 400);
    }

    switch (databaseType) {
      case "TIDB":
        try {
          const mysql = await import('mysql2/promise');
          const mysqlOptions = options || {};
          const mysqlConn = await mysql.default.createConnection({
            host,
            port: Number(port),
            user: username,
            password,
            database: databaseName,
            ssl: mysqlOptions.ssl || undefined,
            connectTimeout: 10000,
          });
          await mysqlConn.end();
        } catch (err: any) {
          throw new Error(`TiDB Error: ${err.message}`);
        }
        break;

      case "SUPABASE":
        try {
          const pgOptions = options || {};
          let ssl: any = { rejectUnauthorized: false };
          
          if (pgOptions.ssl) {
            ssl = { ...pgOptions.ssl };
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

          const pg = await import('pg');
          const pgClient = new pg.default.Client({
            host,
            port: Number(port),
            user: username,
            password,
            database: databaseName,
            connectionTimeoutMillis: 10000,
            ssl: ssl,
          });
          await pgClient.connect();
          await pgClient.end();
        } catch (err: any) {
          throw new Error(`Supabase Error: ${err.message}`);
        }
        break;

      default:
        return ApiResponse.error(`Test connection for ${databaseType} is not implemented yet.`, 400);
    }

    return ApiResponse.success({ message: "Connection successful" });
  } catch (error: any) {
    console.error("Test Connection Error:", error);
    return ApiResponse.error(error.message || "Connection failed. Please check your credentials and host.", 400);
  }
}
