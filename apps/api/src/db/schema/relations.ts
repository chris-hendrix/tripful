import { relations } from "drizzle-orm";
import {
  users,
  trips,
  members,
  events,
  accommodations,
  memberTravel,
  invitations,
} from "./index.js";

export const usersRelations = relations(users, ({ many }) => ({
  createdTrips: many(trips),
  memberships: many(members),
  createdEvents: many(events),
  createdAccommodations: many(accommodations),
  invitations: many(invitations),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(users, { fields: [trips.createdBy], references: [users.id] }),
  members: many(members),
  events: many(events),
  accommodations: many(accommodations),
  memberTravel: many(memberTravel),
  invitations: many(invitations),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  trip: one(trips, { fields: [members.tripId], references: [trips.id] }),
  user: one(users, { fields: [members.userId], references: [users.id] }),
  travel: many(memberTravel),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  trip: one(trips, { fields: [events.tripId], references: [trips.id] }),
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
}));

export const accommodationsRelations = relations(accommodations, ({ one }) => ({
  trip: one(trips, {
    fields: [accommodations.tripId],
    references: [trips.id],
  }),
  creator: one(users, {
    fields: [accommodations.createdBy],
    references: [users.id],
  }),
}));

export const memberTravelRelations = relations(memberTravel, ({ one }) => ({
  trip: one(trips, {
    fields: [memberTravel.tripId],
    references: [trips.id],
  }),
  member: one(members, {
    fields: [memberTravel.memberId],
    references: [members.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  trip: one(trips, { fields: [invitations.tripId], references: [trips.id] }),
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));
