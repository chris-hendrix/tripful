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
  unique,
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

// Event type enum
export const eventTypeEnum = pgEnum("event_type", [
  "travel",
  "meal",
  "activity",
]);

// Member travel type enum
export const memberTravelTypeEnum = pgEnum("member_travel_type", [
  "arrival",
  "departure",
]);

// Invitation status enum
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "failed",
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
    isOrganizer: boolean("is_organizer").notNull().default(false),
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
    tripUserUnique: unique("members_trip_user_unique").on(
      table.tripId,
      table.userId,
    ),
  }),
);

// Inferred types for members table
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

// Invitations table
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id),
    inviteePhone: varchar("invitee_phone", { length: 20 }).notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("invitations_trip_id_idx").on(table.tripId),
    inviteePhoneIdx: index("invitations_invitee_phone_idx").on(table.inviteePhone),
    tripPhoneUnique: unique("invitations_trip_phone_unique").on(
      table.tripId,
      table.inviteePhone,
    ),
  }),
);

// Inferred types for invitations table
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

// Events table
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    eventType: eventTypeEnum("event_type").notNull(),
    location: text("location"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    isOptional: boolean("is_optional").notNull().default(false),
    links: text("links").array(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("events_trip_id_idx").on(table.tripId),
    createdByIdx: index("events_created_by_idx").on(table.createdBy),
    startTimeIdx: index("events_start_time_idx").on(table.startTime),
    deletedAtIdx: index("events_deleted_at_idx").on(table.deletedAt),
  }),
);

// Inferred types for events table
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// Accommodations table
export const accommodations = pgTable(
  "accommodations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    description: text("description"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    links: text("links").array(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("accommodations_trip_id_idx").on(table.tripId),
    createdByIdx: index("accommodations_created_by_idx").on(table.createdBy),
    checkInIdx: index("accommodations_check_in_idx").on(table.checkIn),
    deletedAtIdx: index("accommodations_deleted_at_idx").on(table.deletedAt),
  }),
);

// Inferred types for accommodations table
export type Accommodation = typeof accommodations.$inferSelect;
export type NewAccommodation = typeof accommodations.$inferInsert;

// Member travel table
export const memberTravel = pgTable(
  "member_travel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    travelType: memberTravelTypeEnum("travel_type").notNull(),
    time: timestamp("time", { withTimezone: true }).notNull(),
    location: text("location"),
    details: text("details"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("member_travel_trip_id_idx").on(table.tripId),
    memberIdIdx: index("member_travel_member_id_idx").on(table.memberId),
    timeIdx: index("member_travel_time_idx").on(table.time),
    deletedAtIdx: index("member_travel_deleted_at_idx").on(table.deletedAt),
  }),
);

// Inferred types for member_travel table
export type MemberTravel = typeof memberTravel.$inferSelect;
export type NewMemberTravel = typeof memberTravel.$inferInsert;
