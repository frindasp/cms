export const DB_CONFIG = {
  TIDB: {
    host: process.env.NEXT_PUBLIC_TIDB_HOST,
    port: parseInt(process.env.NEXT_PUBLIC_TIDB_PORT || "3306"),
    user: process.env.NEXT_PUBLIC_TIDB_USER,
    pass: process.env.NEXT_PUBLIC_TIDB_PASS,
    db: process.env.NEXT_PUBLIC_TIDB_DB,
  },
  SUPABASE: {
    host: process.env.NEXT_PUBLIC_SUPABASE_HOST,
    port: parseInt(process.env.NEXT_PUBLIC_SUPABASE_PORT || "5432"),
    user: process.env.NEXT_PUBLIC_SUPABASE_USER,
    pass: process.env.NEXT_PUBLIC_SUPABASE_PASS,
    db: process.env.NEXT_PUBLIC_SUPABASE_DB,
  }
};
