import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import mysql from 'mysql2/promise';
import pg from 'pg';
import * as couchbase from 'couchbase';

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
      case "MYSQL":
      case "TIDB":
        try {
          const mysqlOptions = options || {};
          const mysqlConn = await mysql.createConnection({
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
          throw new Error(`MySQL Error: ${err.message}`);
        }
        break;


      case "POSTGRESQL":
      case "SUPABASE":
      case "YUGABYTE":
        try {
          const pgOptions = options || {};
          let ssl: any = false;
          
          if (databaseType === "SUPABASE" || pgOptions.ssl) {
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
          throw new Error(`PostgreSQL/Yugabyte Error: ${err.message}`);
        }
        break;

      case "COUCHBASE":
        try {
          // Connection string format for Couchbase
          const protocol = options?.protocol || (host.includes("cloud.couchbase.com") ? "couchbases" : "couchbase");
          const clusterConnStr = host.includes("://") ? host : `${protocol}://${host}`;
          
          const cluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
            configProfile: options?.configProfile || "wanDevelopment",
          });
          
          // Verify by pinging the cluster
          await cluster.ping();
          await cluster.close();
        } catch (err: any) {
          throw new Error(`Couchbase Error: ${err.message}`);
        }
        break;
      
      case "MONGODB":
        try {
          const { MongoClient, ServerApiVersion } = await import('mongodb');
          let uri = host;
          if (!uri.startsWith("mongodb")) {
            const authPrefix = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
            const portSuffix = (host.includes(":") || host.includes(",")) ? "" : `:${port}`;
            uri = `mongodb://${authPrefix}${host}${portSuffix}`;
          } else if (!uri.includes("@") && username && password) {
            const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
            if (uri.startsWith("mongodb+srv://")) {
              uri = uri.replace("mongodb+srv://", `mongodb+srv://${credentials}`);
            } else {
              uri = uri.replace("mongodb://", `mongodb://${credentials}`);
            }
          }

          const client = new MongoClient(uri, {
            ...((options as any) || {}),
            serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true,
            },
            connectTimeoutMS: 10000,
          });

          await client.connect();
          await client.db("admin").command({ ping: 1 });
          await client.close();
        } catch (err: any) {
          throw new Error(`MongoDB Error: ${err.message}`);
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
