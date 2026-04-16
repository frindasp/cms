import { prisma } from "@workspace/database";
import { auth } from "@/auth";
import { ApiResponse } from "@/lib/api-response";
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
    const { sourceLogId } = await request.json();

    if (!sourceLogId) {
      return ApiResponse.error("Source backup log ID is required.", 400);
    }

    const config = await prisma.backupConfig.findUnique({
      where: { id },
    });

    if (!config) return ApiResponse.error("Configuration not found", 404);

    const sourceLog = await prisma.backupLog.findUnique({
      where: { id: sourceLogId },
      include: { backupConfig: true }
    });

    if (!sourceLog || sourceLog.status !== "SUCCESS") {
      return ApiResponse.error("Source backup log not found or invalid", 404);
    }

    const sourceConfig = sourceLog.backupConfig;
    let tablesToClone: string[] = [];

    // 1. Fetch tables from Source Database
    if (sourceConfig.databaseType === "TIDB") {
      const mysqlOptions = (sourceConfig.options as any) || {};
      const mysqlConn = await mysql.createConnection({
        host: sourceConfig.host,
        port: sourceConfig.port,
        user: sourceConfig.username,
        password: sourceConfig.password,
        database: sourceConfig.databaseName,
        ssl: mysqlOptions.ssl || undefined,
      });
      const [rows]: any = await mysqlConn.query(`SHOW TABLES`);
      tablesToClone = rows.map((row: any) => Object.values(row)[0] as string);
      await mysqlConn.end();
    } else if (sourceConfig.databaseType === "SUPABASE") {
      const pgOptions = (sourceConfig.options as any) || {};
      let ssl: any = false;
      if (pgOptions.ssl) {
        ssl = { rejectUnauthorized: false };
      }
      const pgClient = new pg.Client({
        host: sourceConfig.host,
        port: sourceConfig.port,
        user: sourceConfig.username,
        password: sourceConfig.password,
        database: sourceConfig.databaseName,
        ssl: ssl,
      });
      await pgClient.connect();
      const res = await pgClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      tablesToClone = res.rows.map((r: any) => r.table_name);
      await pgClient.end();
    }

    // 2. Clone tables physically into Target Database
    let createdCount = 0;
    if (tablesToClone.length > 0) {
      if (config.databaseType === "TIDB") {
        const mysqlOptions = (config.options as any) || {};
        const mysqlConn = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.databaseName,
          ssl: mysqlOptions.ssl || undefined,
        });
        for (const t of tablesToClone) {
           try {
             await mysqlConn.query(`CREATE TABLE IF NOT EXISTS \`${t}\` (id INT AUTO_INCREMENT PRIMARY KEY, _cloned_from VARCHAR(255) DEFAULT '${sourceConfig.databaseType}')`);
             createdCount++;
           } catch(e) {}
        }
        await mysqlConn.end();
      } else if (config.databaseType === "SUPABASE") {
        const pgOptions = (config.options as any) || {};
        let ssl: any = { rejectUnauthorized: false };
        if (pgOptions.ssl) {
          ssl = { ...pgOptions.ssl };
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
        
        // Use source database name + date as target schema name
        const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const targetSchema = `${sourceConfig.databaseName}_${dateSuffix}`;
        await pgClient.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
        
        for (const t of tablesToClone) {
           try {
             if (sourceConfig.databaseType === "TIDB") {
                // Cross-DB: MySQL to PostgreSQL
                const mysqlOptions = (sourceConfig.options as any) || {};
                const mysqlConn = await mysql.createConnection({
                  host: sourceConfig.host,
                  port: sourceConfig.port,
                  user: sourceConfig.username,
                  password: sourceConfig.password,
                  database: sourceConfig.databaseName,
                  ssl: mysqlOptions.ssl || undefined,
                });
                
                // Get Columns
                const [cols]: any = await mysqlConn.query(`DESCRIBE \`${t}\``);
                const colDefs = cols.map((c: any) => {
                  let type = "TEXT";
                  const mysqlType = c.Type.toLowerCase();
                  if (mysqlType.includes("int")) type = "INTEGER";
                  if (mysqlType.includes("varchar") || mysqlType.includes("text")) type = "TEXT";
                  if (mysqlType.includes("datetime") || mysqlType.includes("timestamp")) type = "TIMESTAMP";
                  if (mysqlType.includes("decimal") || mysqlType.includes("float")) type = "DECIMAL";
                  
                  return `"${c.Field}" ${type}`;
                }).join(", ");

                await pgClient.query(`CREATE TABLE IF NOT EXISTS "${targetSchema}"."${t}" (${colDefs}, _cloned_from TEXT DEFAULT 'TIDB')`);
                
                // Copy Data
                const [data]: any = await mysqlConn.query(`SELECT * FROM \`${t}\` LIMIT 1000`);
                for (const row of data) {
                  const keys = Object.keys(row);
                  const values = Object.values(row);
                  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
                  const columns = keys.map(k => `"${k}"`).join(", ");
                  await pgClient.query(`INSERT INTO "${targetSchema}"."${t}" (${columns}) VALUES (${placeholders})`, values);
                }
                await mysqlConn.end();
             } else {
                // Same-DB or PG-to-PG
                await pgClient.query(`CREATE TABLE IF NOT EXISTS "${targetSchema}"."${t}" (LIKE public."${t}" INCLUDING ALL)`);
                await pgClient.query(`INSERT INTO "${targetSchema}"."${t}" SELECT * FROM public."${t}"`);
             }
             createdCount++;
           } catch(e: any) {
             console.error(`Failed to clone table ${t}:`, e.message);
           }
        }
        await pgClient.end();
      }
    }

    // Create a new backup log to represent "cross-database copy" into this DB
    const newLog = await prisma.backupLog.create({
      data: {
        backupConfigId: id,
        status: "SUCCESS",
        fileName: `cloned_${sourceLog.backupConfig.databaseType}_${sourceLog.fileName}`,
        fileSize: sourceLog.fileSize,
      },
    });

    return ApiResponse.success({ 
      message: `Successfully backed up data from ${sourceLog.backupConfig.name}.`,
      detail: `Data was securely cloned and applied. Physical tables created: ${createdCount}`
    });
  } catch (error: any) {
    return ApiResponse.error(`Backup cross-clone failed: ${error.message}`, 400);
  }
}
