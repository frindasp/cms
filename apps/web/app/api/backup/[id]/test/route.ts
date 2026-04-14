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

        // Use new pg.Client to be safe with ESM
        const { Client } = pg;
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

      case "COUCHBASE":
        // Dynamically import to avoid build issues if not used
        const cb = await import('couchbase');
        const cbOptions = config.options as any;
        
        // Automatic protocol detection: 'couchbases' for Cloud/Capella, 'couchbase' for local
        const isCloud = config.host.includes("cloud.couchbase.com");
        const defaultProtocol = isCloud ? "couchbases" : "couchbase";
        const protocol = cbOptions?.protocol || defaultProtocol;
        
        const clusterConnStr = config.host.includes("://") ? config.host : `${protocol}://${config.host}`;
        
        const cluster = await cb.connect(clusterConnStr, {
          username: config.username,
          password: config.password,
          // 'wanDevelopment' helps avoid timeout issues when connecting across different networks
          configProfile: cbOptions?.configProfile || 'wanDevelopment',
        });
        
        // Ping includes specific services to ensure full connectivity
        const pingResult = await cluster.ping();
        message = `Successfully connected to Couchbase cluster. Ping status: ${JSON.stringify(pingResult.services)}`;
        await cluster.close();
        break;

      case "MONGODB":
        const { MongoClient, ServerApiVersion } = await import('mongodb');
        let mongoUri = config.host;
        if (!mongoUri.startsWith("mongodb")) {
          const authPrefix = config.username && config.password ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@` : "";
          const portSuffix = (config.host.includes(":") || config.host.includes(",")) ? "" : `:${config.port}`;
          mongoUri = `mongodb://${authPrefix}${config.host}${portSuffix}`;
        } else if (!mongoUri.includes("@") && config.username && config.password) {
          const credentials = `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
          if (mongoUri.startsWith("mongodb+srv://")) {
            mongoUri = mongoUri.replace("mongodb+srv://", `mongodb+srv://${credentials}`);
          } else {
            mongoUri = mongoUri.replace("mongodb://", `mongodb://${credentials}`);
          }
        }

        const mongoClient = new MongoClient(mongoUri, {
          ...((config.options as any) || {}),
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
          connectTimeoutMS: 10000,
        });

        await mongoClient.connect();
        await mongoClient.db("admin").command({ ping: 1 });
        message = "Successfully connected to MongoDB Atlas.";
        await mongoClient.close();
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
