import { pgTable, uuid, varchar, text, timestamp, index, char } from 'drizzle-orm/pg-core';

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

// Inferred types for users table
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Inferred types for verification_codes table
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
