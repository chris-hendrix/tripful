# Phase 6: Advanced Itinerary & Trip Management

Phase 6 adds five features: meetup location/time on events, auto-lock past trips (full read-only), direct member removal, deleted items section with restore UI, and multi-day event badges.

## DB Schema Changes

Add two nullable columns to the `events` table in `apps/api/src/db/schema/index.ts`:

```typescript
// Add after `location` column (line ~214):
meetupLocation: text("meetup_location"),
meetupTime: timestamp("meetup_time", { withTimezone: true }),
```

Generate migration: `cd apps/api && pnpm db:generate`

No other table changes. Member removal uses hard delete on existing `members` table (same pattern as `revokeInvitation`).

## Shared Schema Updates

**File**: `shared/schemas/event.ts`

Add to `baseEventSchema`:

```typescript
meetupLocation: z.string().max(200).optional(),
meetupTime: z.string().datetime().optional(),
```

Add to `eventResponseSchema`:

```typescript
meetupLocation: z.string().nullable(),
meetupTime: z.string().nullable(),
```

## API Changes

### New Endpoint: Remove Member

```
DELETE /api/trips/:tripId/members/:memberId
```

- **Auth**: Required (organizer only)
- **Behavior**: Hard-deletes member record from `members` table. Also deletes associated invitation record if one exists.
- **Constraints**: Cannot remove the last organizer. Cannot remove the trip creator (`trips.createdBy`).
- **Events**: Events created by removed member REMAIN in the itinerary. The `creatorAttending` boolean in event responses will reflect their removal.
- **Response**: `204 No Content`

**Implementation**: Add `removeMember` method to `InvitationService` (it already handles member deletion in `revokeInvitation`). Register route in `apps/api/src/routes/invitation.routes.ts`.

### Modified Endpoints: Auto-Lock Past Trips

All mutation endpoints must check if the trip's end date has passed. When locked:

- **Blocked**: Create, update, delete for events, accommodations, and member travel
- **Allowed**: Restore deleted items (organizer only), read operations

**Implementation**: Add `isTripLocked(tripId)` method to `PermissionsService`:

```typescript
async isTripLocked(tripId: string): Promise<boolean> {
  const [trip] = await this.db
    .select({ endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!trip || !trip.endDate) return false;
  // Compare trip end date (end of day) with current time
  const endOfTripDay = new Date(trip.endDate);
  endOfTripDay.setHours(23, 59, 59, 999);
  return new Date() > endOfTripDay;
}
```

Add lock checks at the start of:
- `POST /api/trips/:tripId/events` (create event)
- `PUT /api/events/:id` (update event)
- `DELETE /api/events/:id` (delete event)
- `POST /api/trips/:tripId/accommodations` (create accommodation)
- `PUT /api/accommodations/:id` (update accommodation)
- `DELETE /api/accommodations/:id` (delete accommodation)
- `POST /api/trips/:tripId/member-travel` (create member travel)
- `PUT /api/member-travel/:id` (update member travel)
- `DELETE /api/member-travel/:id` (delete member travel)

**NOT blocked**: `POST /api/events/:id/restore`, `POST /api/accommodations/:id/restore`, `POST /api/member-travel/:id/restore`

Return `403` with message: `"This trip has ended and is now read-only"` when locked.

### Modified Endpoints: Meetup Fields

Existing event create/update endpoints already accept any fields matching the Zod schema. Updating the shared schema propagates support. The `EventService.createEvent` and `EventService.updateEvent` methods pass through all validated fields to the DB insert/update, so no service changes needed beyond the schema.

### Existing Endpoints Used for Deleted Items

No new endpoints needed. Use existing:
- `GET /api/trips/:tripId/events?includeDeleted=true` — already supported
- `GET /api/trips/:tripId/accommodations?includeDeleted=true` — already supported
- `GET /api/trips/:tripId/member-travel?includeDeleted=true` — already supported
- Restore endpoints already exist: `POST /api/events/:id/restore`, etc.

## Frontend Components

### Meetup Fields in Event Dialogs

**Files**: `apps/web/src/components/itinerary/create-event-dialog.tsx`, `apps/web/src/components/itinerary/edit-event-dialog.tsx`

Add two form fields after the end time / all-day section:

```tsx
{/* Meetup Location */}
<FormField
  control={form.control}
  name="meetupLocation"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Meetup location</FormLabel>
      <FormControl>
        <Input placeholder="Hotel lobby, parking lot, etc." {...field} value={field.value ?? ""} />
      </FormControl>
      <FormDescription>Where to meet before the event</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

{/* Meetup Time */}
<FormField
  control={form.control}
  name="meetupTime"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Meetup time</FormLabel>
      <FormControl>
        <DateTimePicker
          mode="time"
          timezone={selectedTimezone}
          value={field.value}
          onChange={field.onChange}
        />
      </FormControl>
      <FormDescription>When to meet (can be before event start)</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Meetup Fields on Event Card

**File**: `apps/web/src/components/itinerary/event-card.tsx`

Add in the expanded view section, after location display:

```tsx
{(event.meetupLocation || event.meetupTime) && (
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <Users className="h-3.5 w-3.5 shrink-0" />
    <span>
      Meet{event.meetupLocation ? ` at ${event.meetupLocation}` : ""}
      {event.meetupTime ? ` at ${formatInTimezone(event.meetupTime, timezone, "time")}` : ""}
    </span>
  </div>
)}
```

### Multi-Day Event Badge

**File**: `apps/web/src/components/itinerary/event-card.tsx`

Add a badge when `event.endTime` exists and is on a different day than `event.startTime`:

```tsx
{isMultiDay && (
  <Badge variant="outline" className="text-xs">
    {formatInTimezone(event.startTime, timezone, "short-date")}–{formatInTimezone(event.endTime, timezone, "short-date")}
  </Badge>
)}
```

The `isMultiDay` check:
```typescript
const isMultiDay = event.endTime &&
  getDayInTimezone(event.startTime, timezone) !== getDayInTimezone(event.endTime, timezone);
```

Events still only appear on their start day in day-by-day view (no duplication).

### Deleted Items Section

**File**: `apps/web/src/components/itinerary/itinerary-view.tsx`

Add a collapsible section at the bottom of the itinerary, visible only to organizers.

**Data**: Pass `includeDeleted: true` when fetching events/accommodations/member-travel for organizers. Filter client-side to separate active and deleted items (`deletedAt !== null`).

**UI**: Collapsible section using Collapsible from shadcn or a simple `details`/`summary` element:

```
── Deleted Items (3) ─────────────────────
  [Collapsed by default, click to expand]

  Events:
    Dinner at Joe's (deleted Feb 8)  [Restore]

  Accommodations:
    Beach House (deleted Feb 9)       [Restore]

  Member Travel:
    John's arrival (deleted Feb 10)   [Restore]
```

Use existing hooks: `useRestoreEvent()`, `useRestoreAccommodation()`, `useRestoreMemberTravel()`.

### Auto-Lock UI

**Files**: `apps/web/src/components/itinerary/itinerary-view.tsx`, card components

When trip is locked (end date has passed):
- Hide the floating action button (FAB) for adding items
- Show a subtle banner: "This trip has ended. The itinerary is read-only."
- Hide edit/delete buttons on all cards (events, accommodations, member travel)
- Restore buttons remain visible for organizers in the Deleted Items section

Compute lock status client-side:
```typescript
const isTripLocked = trip.endDate
  ? new Date(`${trip.endDate}T23:59:59.999Z`) < new Date()
  : false;
```

Pass `isLocked` prop to all card components and the FAB.

### Remove Member UI

**File**: `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`

Current flow: `onRemove(member, invitationId)` -> `revokeInvitation.mutate(invitationId)`

New flow: `onRemove(member)` -> `removeMember.mutate({ tripId, memberId })` using a new `useRemoveMember` hook.

The confirmation dialog already exists. Change the mutation to call the new endpoint. Update `MembersList` component (`apps/web/src/components/trip/members-list.tsx`) to pass `member.userId` instead of requiring `invitationId`.

**New hook** in `apps/web/src/hooks/use-invitations.ts`:

```typescript
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, memberId }: { tripId: string; memberId: string }) =>
      apiClient.delete(`/trips/${tripId}/members/${memberId}`),
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ["members", tripId] });
      queryClient.invalidateQueries({ queryKey: ["invitations", tripId] });
    },
  });
}
```

## Testing Strategy

### Unit Tests
- `PermissionsService.isTripLocked()` — past/future/null end dates
- `InvitationService.removeMember()` — removal, last-organizer guard, permission check
- Event service meetup field pass-through

### Integration Tests
- `DELETE /trips/:tripId/members/:memberId` — happy path, unauthorized, last organizer
- Auto-lock: mutation endpoints return 403 for past trip
- Auto-lock: restore endpoints succeed for past trip (not locked)
- Meetup fields: create event with meetup fields, read back, verify values

### E2E Tests (Playwright)
- Organizer views and restores a deleted event from the Deleted Items section
- Past trip shows read-only banner, FAB hidden, edit/delete buttons hidden
- Organizer removes a member; member's events show "no longer attending"
- Create event with meetup location/time, verify display on event card
- Multi-day event shows date range badge
