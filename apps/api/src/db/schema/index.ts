import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  char,
  date,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    phoneNumberIdx: index("users_phone_number_idx").on(table.phoneNumber),
  }),
);

// Verification codes table
export const verificationCodes = pgTable(
  "verification_codes",
  {
    phoneNumber: varchar("phone_number", { length: 20 }).primaryKey(),
    code: char("code", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    expiresAtIdx: index("verification_codes_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);

// Inferred types for users table
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Inferred types for verification_codes table
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;

// RSVP status enum
export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "not_going",
  "maybe",
  "no_response",
]);

// Trips table
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    destination: text("destination").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    preferredTimezone: varchar("preferred_timezone", { length: 100 }).notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    allowMembersToAddEvents: boolean("allow_members_to_add_events")
      .notNull()
      .default(true),
    cancelled: boolean("cancelled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdByIdx: index("trips_created_by_idx").on(table.createdBy),
  }),
);

// Inferred types for trips table
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

// Members table (trip membership and RSVP status)
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull().default("no_response"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("members_trip_id_idx").on(table.tripId),
    userIdIdx: index("members_user_id_idx").on(table.userId),
    tripUserIdx: index("members_trip_user_idx").on(table.tripId, table.userId),
  }),
);

// Inferred types for members table
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
