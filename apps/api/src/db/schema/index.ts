import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  char,
  date,
  boolean,
  integer,
  pgEnum,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    handles: jsonb("handles").$type<Record<string, string>>(),
    timezone: varchar("timezone", { length: 100 }),
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
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
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
    tripIdIsOrganizerIdx: index("members_trip_id_is_organizer_idx").on(
      table.tripId,
      table.isOrganizer,
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
    inviteePhoneIdx: index("invitations_invitee_phone_idx").on(
      table.inviteePhone,
    ),
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
    meetupLocation: text("meetup_location"),
    meetupTime: timestamp("meetup_time", { withTimezone: true }),
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
    tripIdDeletedAtIdx: index("events_trip_id_deleted_at_idx").on(
      table.tripId,
      table.deletedAt,
    ),
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
    checkIn: timestamp("check_in", { withTimezone: true }).notNull(),
    checkOut: timestamp("check_out", { withTimezone: true }).notNull(),
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
    tripIdDeletedAtIdx: index("accommodations_trip_id_deleted_at_idx").on(
      table.tripId,
      table.deletedAt,
    ),
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
    memberIdDeletedAtIdx: index("member_travel_member_id_deleted_at_idx").on(
      table.memberId,
      table.deletedAt,
    ),
    tripIdDeletedAtIdx: index("member_travel_trip_id_deleted_at_idx").on(
      table.tripId,
      table.deletedAt,
    ),
  }),
);

// Inferred types for member_travel table
export type MemberTravel = typeof memberTravel.$inferSelect;
export type NewMemberTravel = typeof memberTravel.$inferInsert;

// Messages table
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => messages.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
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
    tripIdCreatedAtIdx: index("messages_trip_id_created_at_idx").on(
      table.tripId,
      table.createdAt,
    ),
    parentIdIdx: index("messages_parent_id_idx").on(table.parentId),
    authorIdIdx: index("messages_author_id_idx").on(table.authorId),
    tripTopLevelIdx: index("messages_trip_toplevel_idx")
      .on(table.tripId, table.createdAt)
      .where(
        sql`${table.parentId} IS NULL AND ${table.deletedAt} IS NULL`,
      ),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// Message reactions table
export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("message_reactions_message_id_idx").on(
      table.messageId,
    ),
    userIdIdx: index("message_reactions_user_id_idx").on(table.userId),
    messageUserEmojiUnique: unique(
      "message_reactions_message_user_emoji_unique",
    ).on(table.messageId, table.userId, table.emoji),
  }),
);

export type MessageReaction = typeof messageReactions.$inferSelect;
export type NewMessageReaction = typeof messageReactions.$inferInsert;

// Notifications table
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    type: varchar("type", { length: 50 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdCreatedAtIdx: index("notifications_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    userIdCreatedAtDescIdx: index("notifications_user_id_created_at_desc_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    userUnreadIdx: index("notifications_user_unread_idx")
      .on(table.userId, table.createdAt)
      .where(sql`${table.readAt} IS NULL`),
    tripUserCreatedAtIdx: index(
      "notifications_trip_user_created_at_idx",
    ).on(table.tripId, table.userId, table.createdAt),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Notification preferences table
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    eventReminders: boolean("event_reminders").notNull().default(true),
    dailyItinerary: boolean("daily_itinerary").notNull().default(true),
    tripMessages: boolean("trip_messages").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userTripUnique: unique("notification_preferences_user_trip_unique").on(
      table.userId,
      table.tripId,
    ),
  }),
);

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;

// Muted members table
export const mutedMembers = pgTable(
  "muted_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedBy: uuid("muted_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripUserUnique: unique("muted_members_trip_user_unique").on(
      table.tripId,
      table.userId,
    ),
  }),
);

export type MutedMember = typeof mutedMembers.$inferSelect;
export type NewMutedMember = typeof mutedMembers.$inferInsert;

// Sent reminders table
export const sentReminders = pgTable(
  "sent_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 50 }).notNull(),
    referenceId: text("reference_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    typeRefUserUnique: unique("sent_reminders_type_ref_user_unique").on(
      table.type,
      table.referenceId,
      table.userId,
    ),
    typeRefIdx: index("sent_reminders_type_ref_idx").on(
      table.type,
      table.referenceId,
    ),
  }),
);

export type SentReminder = typeof sentReminders.$inferSelect;
export type NewSentReminder = typeof sentReminders.$inferInsert;
