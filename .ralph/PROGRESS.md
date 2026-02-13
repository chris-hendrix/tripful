# Ralph Progress

Tracking implementation progress for Phase 6: Advanced Itinerary & Trip Management.

## Iteration 1 — Task 1.1: Add meetup fields to events schema, shared types, and generate migration

**Status**: ✅ COMPLETED

### Changes Made

| File | Change |
|------|--------|
| `apps/api/src/db/schema/index.ts` | Added `meetupLocation` (text, nullable) and `meetupTime` (timestamp with timezone, nullable) columns to `events` table |
| `shared/schemas/event.ts` | Added `meetupLocation: z.string().max(200).optional()` and `meetupTime: z.string().datetime().optional()` to `baseEventSchema`; Added `meetupLocation: z.string().nullable()` and `meetupTime: z.date().nullable()` to `eventEntitySchema` |
| `shared/types/event.ts` | Added `meetupLocation: string | null` and `meetupTime: Date | null` to `Event` interface |
| `apps/api/src/services/event.service.ts` | Added meetup field mapping in `createEvent` `.values()` call; Added `meetupTime` Date conversion in `updateEvent` |
| `apps/web/src/hooks/use-events.ts` | Added meetup fields to optimistic event objects in `useCreateEvent` and `useUpdateEvent` |
| `apps/api/src/db/migrations/0007_heavy_deathstrike.sql` | Auto-generated migration: `ALTER TABLE "events" ADD COLUMN "meetup_location" text` and `ADD COLUMN "meetup_time" timestamp with time zone` |

### Verification Results

- **Typecheck**: ✅ PASS (all 3 packages — @tripful/shared, @tripful/api, @tripful/web)
- **API tests**: ✅ PASS (33 files, 686 tests)
- **Shared tests**: ✅ PASS (9 files, 185 tests)
- **Web tests**: ✅ 39 files pass, 2 pre-existing failures in `create-trip-dialog.test.tsx` and `edit-trip-dialog.test.tsx` (missing `getUploadUrl` mock — unrelated to meetup fields)
- **Linting**: ✅ PASS (all 3 packages)
- **Migration**: ✅ Applied — columns confirmed in DB via direct query

### Reviewer Assessment

**APPROVED** — All requirements met. Low-severity suggestions noted:
- Test mock objects don't include new fields (non-blocking since tests pass)
- `meetupLocation` uses `text()` in DB but `max(200)` in Zod (consistent with existing `location` pattern)
- No cross-field validation for `meetupTime` vs `startTime` (not in task requirements)

### Learnings for Future Iterations

- **Event service `createEvent` uses explicit field mapping** — every new field must be manually added to the `.values()` call (lines 161-174). `updateEvent` uses `...data` spread so new schema fields auto-propagate (only date conversions needed).
- **`eventEntitySchema` is the response gatekeeper** — Fastify serialization strips fields not in this schema. New fields MUST be added here.
- **Pre-existing web test failures** — `create-trip-dialog.test.tsx` and `edit-trip-dialog.test.tsx` fail due to incomplete `getUploadUrl` mock. Not related to Phase 6 work.
- **Frontend optimistic events use explicit construction** — both `useCreateEvent` and `useUpdateEvent` hooks build event objects field-by-field; new fields must be added manually.

## Iteration 2 — Task 2.1: Backend and frontend support for meetup fields on events

**Status**: ✅ COMPLETED

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/components/itinerary/create-event-dialog.tsx` | Added `meetupLocation` and `meetupTime` to defaultValues and form.reset(); Added Meetup Location (Input) and Meetup Time (DateTimePicker) FormFields after End Time section |
| `apps/web/src/components/itinerary/edit-event-dialog.tsx` | Added `meetupLocation` and `meetupTime` to defaultValues; Added pre-population in useEffect form.reset(); Added Meetup Location and Meetup Time FormFields (with `disabled={isPending \|\| isDeleting}`) |
| `apps/web/src/components/itinerary/event-card.tsx` | Added `Users` icon import from lucide-react; Added meetup info display in expanded view — "Meet at {location} at {time}" with Users icon, using `formatInTimezone` for time |
| `apps/api/tests/integration/event.routes.test.ts` | Added 2 integration tests: create event with meetup fields (POST), update event meetup fields (PUT) |
| `apps/web/src/components/itinerary/__tests__/event-card.test.tsx` | Added `meetupLocation: null, meetupTime: null` to baseEvent; Added 3 tests for meetup display (both fields, both null, location-only) |
| `apps/web/src/components/itinerary/__tests__/create-event-dialog.test.tsx` | Fixed `/location/i` regex to `/^location$/i` to disambiguate from "Meetup location" label |
| `apps/web/src/components/itinerary/__tests__/edit-event-dialog.test.tsx` | Added meetup fields to mockEvent; Fixed `/location/i` regex to `/^location$/i` in 2 places |
| `apps/web/src/hooks/__tests__/use-events.test.tsx` | Added `meetupLocation: null, meetupTime: null` to all 7 mock Event objects |

### Verification Results

- **Typecheck**: ✅ PASS (all 3 packages — @tripful/shared, @tripful/api, @tripful/web)
- **Linting**: ✅ PASS (all 3 packages)
- **API tests**: ✅ PASS (33 files, 688 tests — 2 new meetup integration tests)
- **Shared tests**: ✅ PASS (9 files, 185 tests)
- **Web tests**: ✅ PASS (39 files, 723 tests — 3 new event-card meetup tests). Pre-existing failures in `create-trip-dialog.test.tsx` and `edit-trip-dialog.test.tsx` remain (unrelated)

### Reviewer Assessment

**APPROVED** — All requirements met. Pattern consistency excellent. Low-severity suggestions noted:
- Integration test meetupTime assertions use `toBeTruthy()` instead of exact ISO string match (non-blocking)
- No test for meetupTime-only display without meetupLocation (non-blocking, edge case)
- Meetup fields correctly placed after End Time, before All Day checkbox in both dialogs

### Learnings for Future Iterations

- **Backend was fully wired from Task 1.1** — No backend changes needed for Task 2.1. EventService.createEvent explicit field mapping and updateEvent spread + date conversion already handled meetup fields.
- **Label regex precision matters** — Adding a "Meetup location" form label breaks tests that use `/location/i` regex to find the "Location" label. Fix: use `/^location$/i` for exact match.
- **DateTimePicker has no `mode` prop** — Always shows date+time calendar. Use the same component for meetupTime as for startTime/endTime.
- **Form defaultValues must include all fields** — React Hook Form requires all controlled fields in defaultValues. Missing fields cause uncontrolled-to-controlled warnings.
- **Edit dialog pre-population pattern** — Nullable strings: `event.field || ""`. Nullable dates: `event.field ? new Date(event.field).toISOString() : undefined`. Follow endTime pattern for datetime fields.

## Iteration 3 — Task 3.1: Backend auto-lock and frontend read-only UI for past trips

**Status**: ✅ COMPLETED

### Changes Made

| File | Change |
|------|--------|
| `apps/api/src/errors.ts` | Added `TripLockedError` (403, code "TRIP_LOCKED", message "This trip has ended and is now read-only") |
| `apps/api/src/services/permissions.service.ts` | Added `isTripLocked(tripId)` to `IPermissionsService` interface and `PermissionsService` class — queries trip endDate, compares end-of-day UTC with current time |
| `apps/api/src/services/event.service.ts` | Added lock checks (throw `TripLockedError`) to `createEvent`, `updateEvent`, `deleteEvent`; NOT added to `restoreEvent` |
| `apps/api/src/services/accommodation.service.ts` | Added lock checks to `createAccommodation`, `updateAccommodation`, `deleteAccommodation`; NOT added to `restoreAccommodation` |
| `apps/api/src/services/member-travel.service.ts` | Added lock checks to `createMemberTravel`, `updateMemberTravel`, `deleteMemberTravel`; NOT added to `restoreMemberTravel` |
| `apps/web/src/components/itinerary/itinerary-view.tsx` | Added `isLocked` computation from `trip.endDate`, read-only banner with Lock icon, passed `isLocked` to child components, hid empty-state action buttons when locked |
| `apps/web/src/components/itinerary/itinerary-header.tsx` | Added `isLocked` prop to `ItineraryHeaderProps`, hid FAB with `!isLocked` condition |
| `apps/web/src/components/itinerary/day-by-day-view.tsx` | Added `isLocked` prop, `canModifyEvent`/`canModifyAccommodation`/`canModifyMemberTravel` return `false` when locked |
| `apps/web/src/components/itinerary/group-by-type-view.tsx` | Added `isLocked` prop, same `canModify*` gating as day-by-day-view |
| `apps/api/tests/unit/permissions.service.test.ts` | 4 new tests: past endDate returns true, future returns false, null returns false, non-existent trip returns false |
| `apps/api/tests/integration/event.routes.test.ts` | 4 new tests: create/update/delete return 403 on locked trip, restore returns 200 |
| `apps/api/tests/integration/accommodation.routes.test.ts` | 4 new tests: create/update/delete return 403 on locked trip, restore returns 200 |
| `apps/api/tests/integration/member-travel.routes.test.ts` | 4 new tests: create/update/delete return 403 on locked trip, restore returns 200 |

### Verification Results

- **Typecheck**: ✅ PASS (all 3 packages — @tripful/shared, @tripful/api, @tripful/web)
- **Linting**: ✅ PASS (all 3 packages)
- **API tests**: ✅ PASS (33 files, 704 tests — 16 new lock tests)
- **Shared tests**: ✅ PASS (9 files, 185 tests)
- **Web tests**: ✅ PASS (41 files, 723 tests). Pre-existing failures in `create-trip-dialog.test.tsx` and `edit-trip-dialog.test.tsx` remain (unrelated)

### Reviewer Assessment

**APPROVED** — All 11 requirements met. Issues noted:
- [MEDIUM, non-blocking] Lock check ordering: in update/delete methods, lock check comes after permission check (could cause confusing error message if user lacks permission on a locked trip). Functionally correct — the user cannot modify the trip either way.
- [LOW, fixed] Variable naming `isLocked2`/`isLocked3` in member-travel.service.ts — renamed to `tripLocked` for consistency.

### Learnings for Future Iterations

- **Lock checks go in service layer, not routes** — Consistent with existing permission check pattern. Services have `this.permissionsService` injected. For create operations, `tripId` is a direct parameter. For update/delete, the entity must be fetched first to get its `tripId`.
- **`TripLockedError` uses static message (no `%s` placeholder)** — Unlike `PermissionDeniedError` which uses `%s` for dynamic messages, `TripLockedError` has a fixed message since there's no context-specific information needed.
- **Card components need no changes for locking** — `event-card.tsx`, `accommodation-card.tsx`, `member-travel-card.tsx` already respect `canEdit`/`canDelete` boolean props. Setting those to `false` from parent view components (`day-by-day-view.tsx`, `group-by-type-view.tsx`) is sufficient.
- **`canModify*` functions are duplicated** — Both `day-by-day-view.tsx` and `group-by-type-view.tsx` have identical `canModifyEvent`, `canModifyAccommodation`, `canModifyMemberTravel` functions. Any permission logic change requires updating both files. Consider extracting to shared utility in the future.
- **Drizzle `date()` type returns string** — The `endDate` column is a PostgreSQL `DATE` stored as `"YYYY-MM-DD"` string. Both backend and frontend use `setUTCHours(23, 59, 59, 999)` / `T23:59:59.999Z` for end-of-day UTC comparison.
- **No Alert/Banner shadcn component** — Used a styled `div` with `bg-muted/50` and `Lock` lucide icon, consistent with existing error/empty state patterns in the codebase.
