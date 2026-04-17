import mysql from 'mysql2/promise';
import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const presets = [
  {
    name: "Supabase Cloud",
    type: "SUPABASE",
    host: process.env.SUPABASE_HOST!,
    port: parseInt(process.env.SUPABASE_PORT!),
    db: process.env.SUPABASE_DB!,
    user: process.env.SUPABASE_USER!,
    pass: process.env.SUPABASE_PASS!,
    options: { ssl: { rejectUnauthorized: false } }
  },
  {
    name: "TiDB Cloud Production",
    type: "TIDB",
    host: process.env.TIDB_HOST!,
    port: parseInt(process.env.TIDB_PORT!),
    db: process.env.TIDB_DB!,
    user: process.env.TIDB_USER!,
    pass: process.env.TIDB_PASS!,
    options: { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
  }
];

async function testConnection(preset: any) {
  console.log(`\nTesting [${preset.name}] (${preset.type})...`);
  try {
    switch (preset.type) {
      case "TIDB": {
        const conn = await mysql.createConnection({
          host: preset.host,
          port: preset.port,
          user: preset.user,
          password: preset.pass,
          database: preset.db,
          ssl: preset.options?.ssl || undefined,
        });
        await conn.ping();
        await conn.end();
        break;
      }
      case "SUPABASE": {
        const client = new pg.Client({
          host: preset.host,
          port: preset.port,
          user: preset.user,
          password: preset.pass,
          database: preset.db,
          ssl: preset.options?.ssl || false,
          connectionTimeoutMillis: 10000,
        });
        await client.connect();
        await client.query("SELECT 1");
        await client.end();
        break;
      }
    }
    console.log(`✅ [${preset.name}] SUCCESS`);
  } catch (err: any) {
    console.error(`❌ [${preset.name}] FAILED: ${err.message}`);
  }
}

async function runAll() {
  for (const preset of presets) {
    await testConnection(preset);
  }
}

runAll();
