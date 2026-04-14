import mysql from 'mysql2/promise';
import pg from 'pg';
import * as couchbase from 'couchbase';
import { MongoClient, ServerApiVersion } from 'mongodb';
import * as cassandra from 'cassandra-driver';

const presets = [
  {
    name: "Couchbase Cloud Production",
    type: "COUCHBASE",
    host: "cb.8okbvrgff1vjbwal.cloud.couchbase.com",
    port: 8091,
    db: "default",
    user: "frindasp",
    pass: "4!eZnVq4+vw!",
    options: { configProfile: "wanDevelopment", protocol: "couchbases" }
  },
  {
    name: "YugabyteDB (YSQL)",
    type: "YSQL",
    host: "ap-southeast-3.b0ecb2da-7903-49c0-b31d-2862edf7eb05.aws.yugabyte.cloud",
    port: 5433,
    db: "yugabyte",
    user: "admin",
    pass: "KnKeoNqW-0VXQ0sVc1dTMPBMuBvQJN",
    options: { ssl: { rejectUnauthorized: false } } 
  },
  {
    name: "YugabyteDB (YCQL)",
    type: "YCQL",
    host: "ap-southeast-3.b0ecb2da-7903-49c0-b31d-2862edf7eb05.aws.yugabyte.cloud",
    port: 9042,
    db: "yugabyte",
    user: "admin",
    pass: "KnKeoNqW-0VXQ0sVc1dTMPBMuBvQJN",
    options: { ssl: { rejectUnauthorized: false } }
  },
  {
    name: "MongoDB Atlas (SRV)",
    type: "MONGODB",
    host: "mongodb+srv://frindasp.zjtcpif.mongodb.net",
    port: 27017,
    db: "frindasp",
    user: "frindasp_db_user",
    pass: "Fm9lo6cXLX38V9HK",
    options: { appName: "frindasp" }
  },
  {
    name: "MongoDB Atlas (Standard)",
    type: "MONGODB",
    host: "ac-kdwlelp-shard-00-00.zjtcpif.mongodb.net:27017,ac-kdwlelp-shard-00-01.zjtcpif.mongodb.net:27017,ac-kdwlelp-shard-00-02.zjtcpif.mongodb.net:27017/?ssl=true&replicaSet=atlas-3gfccp-shard-0&authSource=admin",
    port: 27017,
    db: "frindasp",
    user: "frindasp_db_user",
    pass: "Fm9lo6cXLX38V9HK",
    options: { appName: "frindasp" }
  },
  {
    name: "TiDB Cloud Production",
    type: "TIDB",
    host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    port: 3306,
    db: "frindasp",
    user: "2puzcssyZR699bw.root",
    pass: "ghAYdJJAIg3bzcYg",
    options: { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
  }
];

async function testConnection(preset: any) {
  console.log(`\nTesting [${preset.name}] (${preset.type})...`);
  try {
    switch (preset.type) {
      case "MYSQL":
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
      case "COUCHBASE": {
        const protocol = preset.options?.protocol || "couchbase";
        const connStr = preset.host.includes("://") ? preset.host : `${protocol}://${preset.host}`;
        const cluster = await couchbase.connect(connStr, {
          username: preset.user,
          password: preset.pass,
          configProfile: preset.options?.configProfile || 'wanDevelopment',
        });
        await cluster.ping();
        await cluster.close();
        break;
      }
      case "YUGABYTE":
      case "YSQL":
      case "POSTGRESQL": {
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
      case "YCQL": {
        const cassClient = new cassandra.Client({
          contactPoints: [preset.host],
          protocolOptions: { port: preset.port },
          credentials: { username: preset.user, password: preset.pass },
          sslOptions: preset.options?.ssl || null,
          localDataCenter: 'datacenter1'
        });
        await cassClient.connect();
        await cassClient.shutdown();
        break;
      }
      case "MONGODB": {
        let uri = preset.host;
        const credentials = `${encodeURIComponent(preset.user)}:${encodeURIComponent(preset.pass)}@`;
        
        if (!uri.startsWith("mongodb")) {
          const portSuffix = (uri.includes(":") || uri.includes(",")) ? "" : `:${preset.port}`;
          uri = `mongodb://${credentials}${uri}${portSuffix}`;
        } else {
          if (uri.startsWith("mongodb+srv://")) {
            uri = uri.replace("mongodb+srv://", `mongodb+srv://${credentials}`);
          } else {
            uri = uri.replace("mongodb://", `mongodb://${credentials}`);
          }
        }

        const client = new MongoClient(uri, {
          ...preset.options,
          serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
          connectTimeoutMS: 10000,
        });
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        await client.close();
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
