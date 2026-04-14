import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import mysql from 'mysql2/promise';
import pg from 'pg';
import * as couchbase from 'couchbase';

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
      case "MYSQL":
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

      case "POSTGRESQL":
      case "SUPABASE":
      case "YUGABYTE":
      case "YSQL":
        const pgOptions = (config.options as any) || {};
        let ssl: any = false;
        if (config.databaseType === "SUPABASE" || config.databaseType === "YSQL" || pgOptions.ssl) {
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
        const res = await pgClient.query(`
          SELECT 
            datname as "name",
            pg_database_size(datname) as "sizeBytes"
          FROM pg_database 
          WHERE datistemplate = false
          ORDER BY datname ASC
        `);
        schemaList = res.rows.map((row: { name: string; sizeBytes: number | string | null }) => ({
          name: row.name,
          tableCount: undefined,
          sizeBytes: Number(row.sizeBytes || 0),
        }));
        await pgClient.end();
        break;

      case "COUCHBASE":
        // ... handled similarly
        const cbOptions = config.options as any;
        const protocol = cbOptions?.protocol || (config.host.includes("cloud.couchbase.com") ? "couchbases" : "couchbase");
        const clusterConnStr = config.host.includes("://") ? config.host : `${protocol}://${config.host}`;
        
        const cluster = await couchbase.connect(clusterConnStr, {
          username: config.username,
          password: config.password,
          configProfile: cbOptions?.configProfile || "wanDevelopment",
        });
        
        const buckets = await cluster.buckets().getAllBuckets();
        schemaList = buckets.map((b: { name: string; ramQuotaMB: number | string }) => ({
          name: b.name,
          tableCount: undefined,
          sizeBytes: Number(b.ramQuotaMB) * 1024 * 1024, // Using quota as ref
        }));
        await cluster.close();
        break;

      case "MONGODB":
      case "MONGODB_JDBC":
        const { MongoClient, ServerApiVersion } = await import('mongodb');
        let mUri = config.host;

        if (mUri.startsWith("jdbc:mongodb")) {
          mUri = mUri.replace("jdbc:mongodb://", "mongodb://");
        }

        if (!mUri.startsWith("mongodb")) {
          const authPrefix = config.username && config.password ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@` : "";
          const portSuffix = (config.host.includes(":") || config.host.includes(",")) ? "" : `:${config.port}`;
          mUri = `mongodb://${authPrefix}${config.host}${portSuffix}`;
        } else if (!mUri.includes("@") && config.username && config.password) {
          const credentials = `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
          if (mUri.startsWith("mongodb+srv://")) {
            mUri = mUri.replace("mongodb+srv://", `mongodb+srv://${credentials}`);
          } else {
            mUri = mUri.replace("mongodb://", `mongodb://${credentials}`);
          }
        }

        const mongoOptions = typeof config.options === 'string' ? {} : (config.options || {});

        const mClient = new MongoClient(mUri, {
          ...(mongoOptions as any),
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          }
        });

        await mClient.connect();
        const dbs = await mClient.db().admin().listDatabases();
        schemaList = dbs.databases.map((db: any) => ({
          name: db.name,
          tableCount: undefined, // MongoDB collections count is extra call per DB, skipping for now
          sizeBytes: db.sizeOnDisk,
        }));
        await mClient.close();
        break;

      case "YCQL":
        const cassandra = await import('cassandra-driver');
        const ycqlOptions = (config.options as any) || {};
        let ycqlSsl: any = null;

        if (ycqlOptions.ssl) {
          ycqlSsl = { ...ycqlOptions.ssl };
          if (ycqlSsl.ca && typeof ycqlSsl.ca === 'string' && ycqlSsl.ca.includes('.crt')) {
            const fs = await import('fs/promises');
            const path = await import('path');
            ycqlSsl.ca = await fs.readFile(path.join(process.cwd(), ycqlSsl.ca), 'utf8');
          }
        }

        const cassClient = new cassandra.Client({
          contactPoints: [config.host],
          protocolOptions: { port: config.port },
          localDataCenter: ycqlOptions.localDataCenter || 'datacenter1',
          credentials: { username: config.username, password: config.password },
          sslOptions: ycqlSsl,
        });

        await cassClient.connect();
        const keyspaces = await cassClient.execute("SELECT keyspace_name FROM system_schema.keyspaces");
        schemaList = keyspaces.rows.map((row: any) => ({
          name: row.keyspace_name,
          tableCount: undefined,
          sizeBytes: 0, // Cassandra doesn't provide size simply via query easily
        }));
        await cassClient.shutdown();
        break;
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
      case "MYSQL":
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

      case "POSTGRESQL":
      case "SUPABASE":
      case "YUGABYTE":
      case "YSQL":
        const pgOptions = (config.options as any) || {};
        let ssl: any = false;
        if (config.databaseType === "SUPABASE" || config.databaseType === "YSQL" || pgOptions.ssl) {
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
          database: "postgres", // Connect to default DB to drop another
          ssl: ssl,
        });
        await pgClient.connect();
        await pgClient.query(`DROP DATABASE "${schemaName}"`);
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
        
        await cluster.buckets().dropBucket(schemaName);
        await cluster.close();
        break;

      case "YCQL":
        const cassandra = await import('cassandra-driver');
        const ycOptions = (config.options as any) || {};
        let ycqlSsl: any = null;

        if (ycOptions.ssl) {
          ycqlSsl = { ...ycOptions.ssl };
          if (ycqlSsl.ca && typeof ycqlSsl.ca === 'string' && ycqlSsl.ca.includes('.crt')) {
            const fs = await import('fs/promises');
            const path = await import('path');
            ycqlSsl.ca = await fs.readFile(path.join(process.cwd(), ycqlSsl.ca), 'utf8');
          }
        }

        const cassClient = new cassandra.Client({
          contactPoints: [config.host],
          protocolOptions: { port: config.port },
          localDataCenter: ycOptions.localDataCenter || 'datacenter1',
          credentials: { username: config.username, password: config.password },
          sslOptions: ycqlSsl,
        });

        await cassClient.connect();
        await cassClient.execute(`DROP KEYSPACE "${schemaName}"`);
        await cassClient.shutdown();
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
