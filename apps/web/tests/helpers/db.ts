import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { pgTable, uuid, varchar, text, timestamp, index, char } from 'drizzle-orm/pg-core';

// Schema definitions (copied from api/src/db/schema/index.ts)
// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  phoneNumberIdx: index('users_phone_number_idx').on(table.phoneNumber),
}));

// Verification codes table
export const verificationCodes = pgTable('verification_codes', {
  phoneNumber: varchar('phone_number', { length: 20 }).primaryKey(),
  code: char('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  expiresAtIdx: index('verification_codes_expires_at_idx').on(table.expiresAt),
}));

// Create test database connection
// Reads from TEST_DATABASE_URL environment variable or falls back to default
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://tripful:tripful_dev@localhost:5433/tripful_test';

const pool = new Pool({
  connectionString: testDatabaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const testDb: NodePgDatabase = drizzle(pool);

// Cleanup function to close connection pool
export async function closeTestDb(): Promise<void> {
  await pool.end();
}
