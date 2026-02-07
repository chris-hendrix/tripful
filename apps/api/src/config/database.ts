import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "./env.js";

interface Logger {
  info(msg: string): void;
  error(msg: string): void;
  error(obj: unknown, msg: string): void;
}

// Create connection pool
// Tests use unique phone numbers for isolation, not separate databases
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Drizzle with pool
export const db: NodePgDatabase = drizzle(pool);

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
