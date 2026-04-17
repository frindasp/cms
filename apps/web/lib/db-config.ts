export const DB_CONFIG = {
  TIDB: {
    host: process.env.NEXT_PUBLIC_TIDB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    port: parseInt(process.env.NEXT_PUBLIC_TIDB_PORT || "3306"),
    user: process.env.NEXT_PUBLIC_TIDB_USER || "2puzcssyZR699bw.root",
    pass: process.env.NEXT_PUBLIC_TIDB_PASS || "ghAYdJJAIg3bzcYg",
    db: process.env.NEXT_PUBLIC_TIDB_DB || "frindasp",
  },
  SUPABASE: {
    host: process.env.NEXT_PUBLIC_SUPABASE_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
    port: parseInt(process.env.NEXT_PUBLIC_SUPABASE_PORT || "5432"),
    user: process.env.NEXT_PUBLIC_SUPABASE_USER || "postgres.wjofvftbxjljajehkipa",
    pass: process.env.NEXT_PUBLIC_SUPABASE_PASS || "WeMBhnQ9J54RV73z",
    db: process.env.NEXT_PUBLIC_SUPABASE_DB || "postgres",
  }
};
