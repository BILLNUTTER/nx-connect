import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./pg-schema";

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres.vvuqeegvdabuolwzllia:BILLnutter001002@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export const db = drizzle(pool, { schema });

export async function connectDB() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL (Supabase) connected successfully.");
  } catch (error) {
    console.error("PostgreSQL connection error:", error);
    process.exit(1);
  }
}
