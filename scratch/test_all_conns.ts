import mysql from 'mysql2/promise';
import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const presets = [
  {
    name: "Supabase Cloud",
    type: "SUPABASE",
    host: process.env.NEXT_PUBLIC_SUPABASE_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
    port: parseInt(process.env.NEXT_PUBLIC_SUPABASE_PORT || "5432"),
    db: process.env.NEXT_PUBLIC_SUPABASE_DB || "postgres",
    user: process.env.NEXT_PUBLIC_SUPABASE_USER || "postgres.wjofvftbxjljajehkipa",
    pass: process.env.NEXT_PUBLIC_SUPABASE_PASS || "WeMBhnQ9J54RV73z",
    options: { ssl: { rejectUnauthorized: false } }
  },
  {
    name: "TiDB Cloud Production",
    type: "TIDB",
    host: process.env.NEXT_PUBLIC_TIDB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    port: parseInt(process.env.NEXT_PUBLIC_TIDB_PORT || "3306"),
    db: process.env.NEXT_PUBLIC_TIDB_DB || "frindasp",
    user: process.env.NEXT_PUBLIC_TIDB_USER || "2puzcssyZR699bw.root",
    pass: process.env.NEXT_PUBLIC_TIDB_PASS || "ghAYdJJAIg3bzcYg",
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
