import { defineConfig } from "drizzle-kit";

const url =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres.vvuqeegvdabuolwzllia:BILLnutter001002@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

export default defineConfig({
  out: "./migrations",
  schema: "./server/pg-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: true,
  },
});
