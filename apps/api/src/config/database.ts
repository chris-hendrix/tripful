import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env.js";
import * as schema from "@/db/schema/index.js";
import * as relations from "@/db/schema/relations.js";
import type { Logger } from "@/types/logger.js";
import { queryLogger } from "@/plugins/query-logger.js";

const fullSchema = { ...schema, ...relations };

// Create connection pool
// Tests use unique phone numbers for isolation, not separate databases
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Drizzle with pool and schema (enables db.query.* relational API)
export const db = drizzle(pool, { schema: fullSchema, logger: queryLogger });

// Test connection
export async function testConnection(logger?: Logger): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW()");
    const msg = `Database connected successfully (${result.rows[0]?.now})`;
    if (logger) {
      logger.info(msg);
    }
    return true;
  } catch (error) {
    const msg = "Database connection failed";
    if (logger) {
      logger.error(error, msg);
    }
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function closeDatabase(logger?: Logger): Promise<void> {
  await pool.end();
  if (logger) {
    logger.info("Database connection pool closed");
  }
}
