# Phase 4: Itinerary View Modes - Architecture

## Overview

Phase 4 implements the complete itinerary system for Tripful, enabling collaborative trip planning through events, accommodations, and member travel tracking. This phase builds on the existing Trip Management (Phase 3) to add:

1. **Events** - Itinerary items (meals, activities, group travel) with timezone support
2. **Accommodations** - Multi-day lodging with date ranges
3. **Member Travel** - Individual member arrivals/departures
4. **View Modes** - Day-by-day and group-by-type itinerary display
5. **Timezone Toggle** - Display times in trip's timezone or user's local timezone
6. **Permissions** - Fine-grained control over who can create/edit/delete items
7. **Soft Delete** - Recovery capability for accidentally deleted items

## Data Model

### New Tables

#### 1. Events Table

```typescript
export const eventTypeEnum = pgEnum("event_type", [
  "travel", // Group transportation (flights, buses, trains)
  "meal", // Dining events
  "activity", // Activities and experiences
]);

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
    location: text("location"), // e.g., "Restaurant Name" or "JFK → LAX" for travel
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    isOptional: boolean("is_optional").notNull().default(false),
    links: text("links").array(), // Array of URLs for bookings/confirmations
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

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

**Key Design Decisions:**

- `startTime`/`endTime` stored in UTC with timezone support (PostgreSQL `timestamp with time zone`)
- `eventType` enum restricts to three categories (travel, meal, activity)
- `allDay` flag for events without specific times
- `isOptional` indicates members can skip this event
- `links` as text array for multiple booking URLs
- Soft delete via `deletedAt`/`deletedBy` for recovery
- Indexes on `tripId`, `createdBy`, `startTime`, and `deletedAt` for efficient queries

#### 2. Accommodations Table

```typescript
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
    description: text("description"), // Check-in time, room details, confirmation number
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    links: text("links").array(), // Booking URLs
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

export type Accommodation = typeof accommodations.$inferSelect;
export type NewAccommodation = typeof accommodations.$inferInsert;
```

**Key Design Decisions:**

- Multi-day stays: `checkIn` and `checkOut` dates
- Organizer-only creation (enforced at service layer)
- Date-based (not timestamp) - accommodations span full days
- Soft delete for recovery

#### 3. Member Travel Table

```typescript
export const memberTravelTypeEnum = pgEnum("member_travel_type", [
  "arrival",
  "departure",
]);

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
    location: text("location"), // e.g., "JFK Airport" or "Miami Hotel"
    details: text("details"), // Flight number, train details, etc.
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

export type MemberTravel = typeof memberTravel.$inferSelect;
export type NewMemberTravel = typeof memberTravel.$inferInsert;
```

**Key Design Decisions:**

- Separate table from events (not group transportation)
- Linked to `members` table, not `users` (trip-specific context)
- Two types: arrival and departure
- Members + organizers can edit

## Service Layer

### Events Service

```typescript
export interface IEventService {
  createEvent(
    tripId: string,
    userId: string,
    data: CreateEventInput,
  ): Promise<Event>;
  getEvent(eventId: string): Promise<Event | null>;
  getEventsByTrip(tripId: string, includeDeleted?: boolean): Promise<Event[]>;
  updateEvent(
    eventId: string,
    userId: string,
    data: UpdateEventInput,
  ): Promise<Event>;
  deleteEvent(eventId: string, userId: string): Promise<void>;
  restoreEvent(eventId: string, userId: string): Promise<Event>;
}

export class EventService implements IEventService {
  constructor(
    private db: AppDatabase,
    private permissionsService: IPermissionsService,
  ) {}

  async createEvent(
    tripId: string,
    userId: string,
    data: CreateEventInput,
  ): Promise<Event> {
    // 1. Check if user can add events (organizer OR member with going status + allowMembersToAddEvents)
    const canAdd = await this.permissionsService.canAddEvent(userId, tripId);
    if (!canAdd)
      throw new PermissionDeniedError(
        "You don't have permission to add events",
      );

    // 2. Validate time range
    if (data.endTime && new Date(data.endTime) <= new Date(data.startTime)) {
      throw new ValidationError("End time must be after start time");
    }

    // 3. Insert event
    const [event] = await this.db
      .insert(events)
      .values({
        tripId,
        createdBy: userId,
        ...data,
      })
      .returning();

    return event;
  }

  async updateEvent(
    eventId: string,
    userId: string,
    data: UpdateEventInput,
  ): Promise<Event> {
    // 1. Check if user can edit (creator OR organizer)
    const canEdit = await this.permissionsService.canEditEvent(userId, eventId);
    if (!canEdit)
      throw new PermissionDeniedError(
        "You don't have permission to edit this event",
      );

    // 2. Update event
    const [updated] = await this.db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning();

    if (!updated) throw new EventNotFoundError();
    return updated;
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    // Soft delete: set deletedAt and deletedBy
    const canDelete = await this.permissionsService.canDeleteEvent(
      userId,
      eventId,
    );
    if (!canDelete)
      throw new PermissionDeniedError(
        "You don't have permission to delete this event",
      );

    await this.db
      .update(events)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(events.id, eventId));
  }

  async restoreEvent(eventId: string, userId: string): Promise<Event> {
    // Organizers only can restore
    const event = await this.getEvent(eventId);
    if (!event) throw new EventNotFoundError();

    const isOrganizer = await this.permissionsService.isOrganizer(
      userId,
      event.tripId,
    );
    if (!isOrganizer)
      throw new PermissionDeniedError("Only organizers can restore events");

    const [restored] = await this.db
      .update(events)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(events.id, eventId))
      .returning();

    return restored!;
  }
}
```

### Accommodations Service

Similar structure to EventService, but:

- **Organizer-only creation** (stricter permissions)
- Date validation (checkOut must be after checkIn)
- Multi-day range checks

### Member Travel Service

Similar structure, but:

- **Member + organizers** can edit their own travel
- Validation: arrival/departure times should align with trip dates

### Extended Permissions Service

```typescript
export interface IPermissionsService {
  // ... existing methods

  // NEW: Event permissions
  canAddEvent(userId: string, tripId: string): Promise<boolean>;
  canEditEvent(userId: string, eventId: string): Promise<boolean>;
  canDeleteEvent(userId: string, eventId: string): Promise<boolean>;

  // NEW: Accommodation permissions (organizer-only)
  canAddAccommodation(userId: string, tripId: string): Promise<boolean>;
  canEditAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean>;
  canDeleteAccommodation(
    userId: string,
    accommodationId: string,
  ): Promise<boolean>;

  // NEW: Member travel permissions
  canAddMemberTravel(userId: string, tripId: string): Promise<boolean>;
  canEditMemberTravel(userId: string, memberTravelId: string): Promise<boolean>;
  canDeleteMemberTravel(
    userId: string,
    memberTravelId: string,
  ): Promise<boolean>;
}
```

**Permission Rules:**

- **Events**: Organizer OR (member with status='going' AND trip.allowMembersToAddEvents)
- **Edit/Delete Event**: Creator OR organizer
- **Accommodations**: Organizer only
- **Member Travel**: Owner OR organizer

## API Design

### Event Endpoints

```
POST   /trips/:tripId/events               Create event
GET    /trips/:tripId/events               List events (exclude soft-deleted by default)
GET    /trips/:tripId/events/:eventId      Get event details
PUT    /trips/:tripId/events/:eventId      Update event
DELETE /trips/:tripId/events/:eventId      Soft delete event
POST   /trips/:tripId/events/:eventId/restore  Restore soft-deleted event
```

### Accommodation Endpoints

```
POST   /trips/:tripId/accommodations       Create accommodation
GET    /trips/:tripId/accommodations       List accommodations
GET    /trips/:tripId/accommodations/:id   Get accommodation details
PUT    /trips/:tripId/accommodations/:id   Update accommodation
DELETE /trips/:tripId/accommodations/:id   Soft delete accommodation
POST   /trips/:tripId/accommodations/:id/restore  Restore accommodation
```

### Member Travel Endpoints

```
POST   /trips/:tripId/member-travel        Create member travel
GET    /trips/:tripId/member-travel        List member travel
GET    /trips/:tripId/member-travel/:id    Get member travel details
PUT    /trips/:tripId/member-travel/:id    Update member travel
DELETE /trips/:tripId/member-travel/:id    Soft delete member travel
POST   /trips/:tripId/member-travel/:id/restore  Restore member travel
```

## Frontend Architecture

### Route Structure

Integrate itinerary into existing trip detail page:

```
/trips/[id]  →  apps/web/src/app/(app)/trips/[id]/page.tsx
```

The page will contain:

- Trip header (existing)
- **NEW: Itinerary section** with:
  - View mode toggle (day-by-day / group-by-type)
  - Timezone toggle (trip's timezone / my timezone)
  - Itinerary content area

### Component Structure

```
components/
  itinerary/
    itinerary-view.tsx                  # Main container component
    itinerary-header.tsx                # View mode + timezone toggles
    day-by-day-view.tsx                 # Day-by-day grouped view
    group-by-type-view.tsx              # Type-grouped view
    event-card.tsx                      # Event display card (expandable)
    accommodation-card.tsx              # Accommodation display (compact/expanded)
    member-travel-card.tsx              # Arrival/departure display
    create-event-dialog.tsx             # Event creation form
    edit-event-dialog.tsx               # Event edit form
    create-accommodation-dialog.tsx     # Accommodation creation form
    edit-accommodation-dialog.tsx       # Accommodation edit form
    create-member-travel-dialog.tsx     # Member travel creation form
    edit-member-travel-dialog.tsx       # Member travel edit form
```

### State Management (TanStack Query)

```typescript
// apps/web/src/hooks/use-events.ts
export const eventKeys = {
  all: ["events"] as const,
  byTrip: (tripId: string) => [...eventKeys.all, "trip", tripId] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
};

export function useEvents(tripId: string) {
  return useQuery({
    queryKey: eventKeys.byTrip(tripId),
    queryFn: () => apiClient.get(`/trips/${tripId}/events`),
  });
}

export function useCreateEvent(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventInput) =>
      apiClient.post(`/trips/${tripId}/events`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.byTrip(tripId) });
      toast.success("Event created!");
    },
  });
}
```

Similar hooks for accommodations and member travel.

### View Mode Logic

#### Day-by-Day View

```typescript
interface DayGroup {
  date: string; // YYYY-MM-DD
  accommodation?: Accommodation;
  arrivals: MemberTravel[];
  departures: MemberTravel[];
  events: Event[]; // Sorted by startTime
}

function groupByDay(
  events: Event[],
  accommodations: Accommodation[],
  memberTravel: MemberTravel[],
  timezone: string,
): DayGroup[] {
  // 1. Determine all dates (trip.startDate to trip.endDate)
  // 2. For each date:
  //    - Find accommodation that spans this date
  //    - Find arrivals and departures for this date
  //    - Find events for this date (filter by startTime in timezone)
  //    - Sort events by time (all-day events first)
  // 3. Return array of DayGroup
}
```

#### Group-by-Type View

```typescript
interface TypeGroup {
  type: "accommodation" | "travel" | "meal" | "activity";
  items: Array<Event | Accommodation>; // Sorted by date/time
}

function groupByType(
  events: Event[],
  accommodations: Accommodation[],
): TypeGroup[] {
  // 1. Group accommodations
  // 2. Group events by eventType
  // 3. Sort each group by date/time
  // NOTE: Member Travel NOT included (stays in day-by-day context)
}
```

### Timezone Conversion

```typescript
// Utility for converting timestamps to display timezone
function formatInTimezone(
  timestamp: Date | string,
  timezone: string,
  format: "date" | "time" | "datetime",
): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...(format === "date" && { dateStyle: "medium" }),
    ...(format === "time" && { timeStyle: "short" }),
    ...(format === "datetime" && { dateStyle: "medium", timeStyle: "short" }),
  }).format(date);
}
```

Display times using:

- `trip.preferredTimezone` (default)
- `user.timezone` (when toggled)

## Testing Strategy

### Unit Tests (Vitest)

- Service methods (create, update, delete, restore)
- Permission checks
- Timezone conversion utilities
- Date grouping logic (day-by-day, group-by-type)

### Integration Tests (Vitest + Test DB)

- API endpoints with authentication
- Permission-based access control
- Soft delete and restore flows
- Cross-field validation (e.g., endTime > startTime)

### Component Tests (Vitest + React Testing Library)

- Form validation (React Hook Form + Zod)
- View mode switching
- Timezone toggle
- Card expand/collapse

### E2E Tests (Playwright)

- Create event flow (authenticated member)
- Create accommodation flow (organizer only)
- Add member travel (member + organizer)
- View mode switching (day-by-day ↔ group-by-type)
- Timezone toggle (trip timezone ↔ user timezone)
- Delete and restore event
- Permission denial (non-member tries to add event)

### Manual Testing (Playwright + Screenshots)

- Responsive layouts (mobile, tablet, desktop)
- Itinerary views with real data
- Timezone display accuracy
- Event card collapsed/expanded states
- Accommodation multi-day display
- Member travel compact display

Screenshots to capture:

- `day-by-day-view-desktop.png`
- `day-by-day-view-mobile.png`
- `group-by-type-view-desktop.png`
- `timezone-toggle-before-after.png`
- `create-event-dialog.png`
- `accommodation-multi-day.png`
- `member-travel-arrivals.png`

## Database Migrations

### Migration 1: Create Events Table

- Create `event_type` enum
- Create `events` table with indexes
- Add foreign keys with cascade delete

### Migration 2: Create Accommodations Table

- Create `accommodations` table with indexes
- Add foreign keys with cascade delete

### Migration 3: Create Member Travel Table

- Create `member_travel_type` enum
- Create `member_travel` table with indexes
- Add foreign keys with cascade delete

## Deployment Considerations

- **No feature flags** - deploy directly when Phase 4 is complete
- **Database migrations** must run before deploying new API code
- **Zero-downtime deployment** - migrations are additive (new tables), no breaking changes
- **API backward compatibility** - existing trip endpoints remain unchanged

## Open Questions / Decisions Made

1. **Data model**: ✅ Separate tables (events, accommodations, member_travel) for type safety
2. **Soft delete**: ✅ Use deletedAt/deletedBy columns in each table
3. **Route structure**: ✅ Integrate itinerary into /trips/[id] page
4. **Timezone toggle**: ✅ Sticky header bar on itinerary view
5. **Event permissions**: ✅ Extend PermissionsService with canAddEvent, canEditEvent, canDeleteEvent
6. **Member travel permissions**: ✅ Member + organizers can edit
7. **Testing**: ✅ All levels (unit, integration, component, E2E, manual with screenshots)
8. **Feature flags**: ✅ No feature flag needed

## Success Criteria

Phase 4 is complete when:

1. ✅ All database tables created with proper indexes and foreign keys
2. ✅ Services implement full CRUD + restore for events, accommodations, member travel
3. ✅ Permissions service extended with fine-grained checks
4. ✅ API endpoints handle all operations with validation
5. ✅ Frontend displays day-by-day view with accommodations, arrivals, departures, events
6. ✅ Frontend displays group-by-type view with sorted items
7. ✅ Timezone toggle works correctly (trip ↔ user timezone)
8. ✅ Create/edit/delete dialogs work for all entity types
9. ✅ Soft delete and restore functional for organizers
10. ✅ All tests pass (unit, integration, component, E2E)
11. ✅ Manual testing screenshots captured for all key states
12. ✅ Permission checks prevent unauthorized actions

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
**Phase**: 4 (Itinerary View Modes)
