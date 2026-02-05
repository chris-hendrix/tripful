import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from './env.js';

// Create connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Drizzle with pool
export const db: NodePgDatabase = drizzle(pool);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
    console.log(`  Timestamp: ${result.rows[0]?.now}`);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('✓ Database connection pool closed');
}
