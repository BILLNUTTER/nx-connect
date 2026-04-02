import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./pg-schema";

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres.vvuqeegvdabuolwzllia:BILLnutter001002@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

// In serverless environments (Vercel) keep the pool small to avoid exhausting
// database connection limits across concurrent function invocations.
const isServerless = !!process.env.VERCEL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: isServerless ? 2 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

export async function connectDB() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL (Supabase) connected successfully.");
  } catch (error) {
    console.error("PostgreSQL connection error:", error);
    // Do NOT call process.exit() — it kills serverless workers.
    // The pool will retry on the next request.
    throw error;
  }
}
