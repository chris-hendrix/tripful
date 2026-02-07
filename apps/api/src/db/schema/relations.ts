import { relations } from "drizzle-orm";
import { users, trips, members } from "./index.js";

export const usersRelations = relations(users, ({ many }) => ({
  createdTrips: many(trips),
  memberships: many(members),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(users, { fields: [trips.createdBy], references: [users.id] }),
  members: many(members),
}));

export const membersRelations = relations(members, ({ one }) => ({
  trip: one(trips, { fields: [members.tripId], references: [trips.id] }),
  user: one(users, { fields: [members.userId], references: [users.id] }),
}));
