# Phase 4: Itinerary View Modes - Tasks

## Task Status Legend

- `[ ]` - Not started
- `[x]` - Completed

---

- [x] Task 1: Database Schema and Migrations

Create all database tables (events, accommodations, member_travel) with enums, indexes, foreign keys, and soft delete support.

- Implement:
  - Create `event_type` enum ("travel", "meal", "activity")
  - Create `member_travel_type` enum ("arrival", "departure")
  - Create `events` table with columns: id, tripId, createdBy, name, description, eventType, location, startTime, endTime, allDay, isOptional, links (text array), deletedAt, deletedBy, createdAt, updatedAt
  - Add indexes: tripId, createdBy, startTime, deletedAt
  - Add foreign keys: tripId → trips.id (cascade), createdBy → users.id, deletedBy → users.id
  - Create `accommodations` table with columns: id, tripId, createdBy, name, address, description, checkIn (date), checkOut (date), links (text array), deletedAt, deletedBy, createdAt, updatedAt
  - Add indexes: tripId, createdBy, checkIn, deletedAt
  - Add foreign keys: tripId → trips.id (cascade), createdBy → users.id, deletedBy → users.id
  - Create `member_travel` table with columns: id, tripId, memberId, travelType, time, location, details, deletedAt, deletedBy, createdAt, updatedAt
  - Add indexes: tripId, memberId, time, deletedAt
  - Add foreign keys: tripId → trips.id (cascade), memberId → members.id (cascade), deletedBy → users.id
  - Define TypeScript types: Event, NewEvent, Accommodation, NewAccommodation, MemberTravel, NewMemberTravel using `typeof table.$inferSelect`
  - Generate Drizzle migrations: `cd apps/api && pnpm db:generate`
  - Review generated SQL files for correctness
  - Apply migrations: `pnpm db:migrate`
  - Verify tables exist in Drizzle Studio: `pnpm db:studio`

- Test:
  - Unit test: Drizzle schema inference produces correct types
  - Integration test: Insert and query each table to verify schema constraints

---

- [x] Task 2: Shared Validation Schemas

Create Zod validation schemas for events, accommodations, and member travel in the shared package.

- Implement:
  - Create `shared/schemas/event.ts`:
    - `createEventSchema`: name (1-255 chars), description (max 2000 chars, optional), eventType (enum), location (optional), startTime (ISO datetime), endTime (ISO datetime, optional), allDay (boolean), isOptional (boolean), links (URL array, max 10, optional)
    - Cross-field validation: if endTime provided, must be after startTime
    - `updateEventSchema`: Partial of createEventSchema
    - Export types: CreateEventInput, UpdateEventInput using z.infer
  - Create `shared/schemas/accommodation.ts`:
    - `createAccommodationSchema`: name (1-255 chars), address (optional), description (max 2000 chars, optional), checkIn (ISO date), checkOut (ISO date), links (URL array, max 10, optional)
    - Cross-field validation: checkOut must be after checkIn
    - `updateAccommodationSchema`: Partial of createAccommodationSchema
    - Export types: CreateAccommodationInput, UpdateAccommodationInput
  - Create `shared/schemas/member-travel.ts`:
    - `createMemberTravelSchema`: travelType (enum: arrival/departure), time (ISO datetime), location (optional), details (max 500 chars, optional)
    - `updateMemberTravelSchema`: Partial of createMemberTravelSchema
    - Export types: CreateMemberTravelInput, UpdateMemberTravelInput
  - Update `shared/schemas/index.ts` to re-export all new schemas and types
  - Ensure all schemas follow existing patterns from `trip.ts`

- Test:
  - Unit test: Valid inputs pass validation
  - Unit test: Invalid inputs fail with correct error messages
  - Unit test: Cross-field validation works (endTime > startTime, checkOut > checkIn)
  - Unit test: Type inference produces correct TypeScript types

---

- [x] Task 3: Permissions Service Extensions

Extend the existing PermissionsService to support fine-grained permissions for events, accommodations, and member travel.

- Implement:
  - Update `IPermissionsService` interface in `apps/api/src/services/permissions.service.ts`:
    - Add `canAddEvent(userId, tripId)`: Check if user is organizer OR (member with status='going' AND trip.allowMembersToAddEvents)
    - Add `canEditEvent(userId, eventId)`: Check if user is event creator OR organizer of event's trip
    - Add `canDeleteEvent(userId, eventId)`: Same as canEditEvent
    - Add `canAddAccommodation(userId, tripId)`: Check if user is organizer (organizer-only)
    - Add `canEditAccommodation(userId, accommodationId)`: Check if user is organizer
    - Add `canDeleteAccommodation(userId, accommodationId)`: Check if user is organizer
    - Add `canAddMemberTravel(userId, tripId)`: Check if user is member of trip (any status)
    - Add `canEditMemberTravel(userId, memberTravelId)`: Check if user is travel owner OR organizer
    - Add `canDeleteMemberTravel(userId, memberTravelId)`: Same as canEditMemberTravel
  - Implement all methods in `PermissionsService` class:
    - Use efficient SQL queries with LEFT JOINs where needed
    - Reuse existing `isOrganizer()` and `isMember()` helpers
    - Add helper methods as needed (e.g., `isEventCreator(userId, eventId)`)
  - Add custom errors in `apps/api/src/errors.ts`:
    - `EventNotFoundError`, `AccommodationNotFoundError`, `MemberTravelNotFoundError`
    - `EventConflictError`, `InvalidDateRangeError`

- Test:
  - Unit test: Each permission method returns true for authorized users
  - Unit test: Each permission method returns false for unauthorized users
  - Integration test: Permission checks work with real database queries
  - Integration test: Edge cases (deleted events, non-existent trips, missing members)

---

- [ ] Task 4: Backend Services (Events, Accommodations, Member Travel)

Implement service layer for all CRUD operations including soft delete and restore.

- Implement:
  - Create `apps/api/src/services/event.service.ts`:
    - Define `IEventService` interface with methods: createEvent, getEvent, getEventsByTrip, updateEvent, deleteEvent, restoreEvent
    - Implement `EventService` class:
      - Constructor: inject `db` and `permissionsService`
      - `createEvent`: Check canAddEvent, validate time range, insert event, return created event
      - `getEvent`: Query by ID, return null if not found or soft-deleted
      - `getEventsByTrip`: Query by tripId, exclude soft-deleted by default (includeDeleted param), return array
      - `updateEvent`: Check canEditEvent, update fields, return updated event
      - `deleteEvent`: Check canDeleteEvent, soft delete (set deletedAt/deletedBy)
      - `restoreEvent`: Check isOrganizer, clear deletedAt/deletedBy, return restored event
  - Create `apps/api/src/services/accommodation.service.ts`:
    - Define `IAccommodationService` interface
    - Implement `AccommodationService` class (similar structure to EventService)
    - Organizer-only permissions for create/edit/delete
    - Validate date ranges (checkOut > checkIn, dates within trip range if applicable)
  - Create `apps/api/src/services/member-travel.service.ts`:
    - Define `IMemberTravelService` interface
    - Implement `MemberTravelService` class (similar structure)
    - Member + organizer permissions
  - Register services in `apps/api/src/server.ts` (dependency injection):
    - Instantiate EventService, AccommodationService, MemberTravelService
    - Add to Fastify instance: `fastify.decorate("eventService", eventService)`
    - Update Fastify type declarations to include new services

- Test:
  - Unit test: Each service method with mocked database and permissions
  - Integration test: Full CRUD flow for each entity type
  - Integration test: Soft delete and restore flows
  - Integration test: Permission checks prevent unauthorized actions
  - Integration test: Validation errors handled correctly (invalid date ranges, missing fields)

---

- [ ] Task 5: API Endpoints

Create REST API routes for events, accommodations, and member travel.

- Implement:
  - Create `apps/api/src/routes/event.routes.ts`:
    - POST `/trips/:tripId/events` - Create event (auth + complete profile required)
    - GET `/trips/:tripId/events` - List events (auth required, exclude soft-deleted by default)
    - GET `/trips/:tripId/events/:eventId` - Get event details (auth required)
    - PUT `/trips/:tripId/events/:eventId` - Update event (auth + complete profile required)
    - DELETE `/trips/:tripId/events/:eventId` - Soft delete event (auth + complete profile required)
    - POST `/trips/:tripId/events/:eventId/restore` - Restore event (auth + complete profile required)
    - Use Zod schemas for request validation
    - Use `authenticate` + `requireCompleteProfile` middleware for write operations
    - Implement controllers that delegate to EventService
  - Create `apps/api/src/routes/accommodation.routes.ts`:
    - Similar structure to event routes
    - POST, GET (list), GET (detail), PUT, DELETE, POST (restore)
  - Create `apps/api/src/routes/member-travel.routes.ts`:
    - Similar structure to event routes
    - POST, GET (list), GET (detail), PUT, DELETE, POST (restore)
  - Register routes in `apps/api/src/server.ts`:
    - `fastify.register(eventRoutes, { prefix: "/api" })`
    - `fastify.register(accommodationRoutes, { prefix: "/api" })`
    - `fastify.register(memberTravelRoutes, { prefix: "/api" })`
  - Add controllers in `apps/api/src/controllers/` (event.controller.ts, accommodation.controller.ts, member-travel.controller.ts)
    - Extract userId from `request.user.sub`
    - Call service methods with proper error handling
    - Return consistent response format: `{ success: true/false, data/error }`
    - Log errors with request context

- Test:
  - Integration test: Each endpoint with valid authenticated requests
  - Integration test: Each endpoint with invalid requests (validation errors)
  - Integration test: Each endpoint with unauthorized requests (403 Forbidden)
  - Integration test: Each endpoint with missing authentication (401 Unauthorized)
  - Integration test: Soft delete and restore endpoints
  - Integration test: Query parameters (e.g., includeDeleted=true)

---

- [ ] Task 6: Frontend Data Hooks (TanStack Query)

Create React hooks for fetching and mutating events, accommodations, and member travel data.

- Implement:
  - Create `apps/web/src/hooks/use-events.ts`:
    - Define query keys: `eventKeys.all`, `eventKeys.byTrip(tripId)`, `eventKeys.detail(id)`
    - `useEvents(tripId)`: Query hook for listing events
    - `useEvent(eventId)`: Query hook for single event
    - `useCreateEvent(tripId)`: Mutation hook with optimistic updates, success toast, error handling
    - `useUpdateEvent(tripId)`: Mutation hook with optimistic updates
    - `useDeleteEvent(tripId)`: Mutation hook with optimistic removal
    - `useRestoreEvent(tripId)`: Mutation hook with optimistic restore
    - Helper function: `getEventErrorMessage(error)` - Extract user-friendly error messages
  - Create `apps/web/src/hooks/use-accommodations.ts`:
    - Similar structure to use-events.ts
    - Query and mutation hooks for accommodations
  - Create `apps/web/src/hooks/use-member-travel.ts`:
    - Similar structure to use-events.ts
    - Query and mutation hooks for member travel
  - Ensure hooks follow existing patterns from `use-trips.ts`:
    - Optimistic updates with rollback on error
    - Query invalidation on success
    - Toast notifications for success/error
    - Consistent error message extraction

- Test:
  - Component test: Hooks return loading state while fetching
  - Component test: Hooks return data after successful fetch
  - Component test: Mutation hooks show success toast
  - Component test: Mutation hooks show error toast on failure
  - Component test: Optimistic updates work correctly (add, update, delete)
  - Component test: Rollback works on mutation error

---

- [ ] Task 7: Itinerary View Components (Day-by-Day & Group-by-Type)

Build the itinerary display components with view mode switching and timezone toggle.

- Implement:
  - Create `apps/web/src/components/itinerary/itinerary-view.tsx`:
    - Main container component that fetches all itinerary data (events, accommodations, member travel)
    - Manages view mode state: "day-by-day" (default) or "group-by-type"
    - Manages timezone state: "trip" (default) or "user"
    - Passes data and state to child components
  - Create `apps/web/src/components/itinerary/itinerary-header.tsx`:
    - Sticky header with two toggle controls:
      - View mode toggle button (icon + label)
      - Timezone toggle button (icon + label, shows current timezone)
    - Follows Mediterranean design system (Tailwind v4 tokens)
    - Responsive layout (stack on mobile)
  - Create `apps/web/src/components/itinerary/day-by-day-view.tsx`:
    - Accepts events, accommodations, member travel, timezone, trip dates
    - Groups data by date (YYYY-MM-DD format)
    - For each day, renders:
      - Day header (date in human-readable format)
      - Compact accommodation section (if applicable) - collapsed by default
      - Compact arrivals section (if any) - single line per member
      - Compact departures section (if any) - single line per member
      - Event cards (sorted by time, all-day events first)
    - Uses `formatInTimezone` utility to display times correctly
    - Shows empty state if no itinerary items
  - Create `apps/web/src/components/itinerary/group-by-type-view.tsx`:
    - Accepts events, accommodations, timezone
    - Groups by type: Accommodations, Travel Events, Meal Events, Activity Events
    - Each type section shows items sorted by date/time
    - Does NOT include member travel (stays in day-by-day context per PRD)
    - Shows empty state if no items in a category
  - Create `apps/web/src/components/itinerary/event-card.tsx`:
    - Displays single event with: icon (based on type), name, time, location, optional badge
    - Expandable to show description, links, creator info
    - Edit/delete buttons visible if user has permissions
    - Shows "Created by [name]" badge
  - Create `apps/web/src/components/itinerary/accommodation-card.tsx`:
    - Compact view: name + multi-day indicator
    - Expanded view: address, description, links, check-in/check-out times
    - Edit/delete buttons for organizers
  - Create `apps/web/src/components/itinerary/member-travel-card.tsx`:
    - Single-line display: icon, member name, time, location
    - Expandable to show details
    - Edit/delete buttons for member (owner) or organizers
  - Create `apps/web/src/lib/utils/timezone.ts`:
    - `formatInTimezone(timestamp, timezone, format)`: Uses Intl.DateTimeFormat
    - Handles date, time, and datetime formats
    - Edge case handling for invalid timezones
  - Update `apps/web/src/app/(app)/trips/[id]/page.tsx`:
    - Integrate `<ItineraryView />` component into trip detail page
    - Pass trip data (timezone, dates) to ItineraryView
    - Add spacing/layout to separate trip header from itinerary section

- Test:
  - Component test: ItineraryView renders day-by-day view by default
  - Component test: View mode toggle switches between day-by-day and group-by-type
  - Component test: Timezone toggle switches between trip and user timezone
  - Component test: Day-by-day view groups items correctly by date
  - Component test: Group-by-type view groups items correctly by type
  - Component test: Event cards expand/collapse correctly
  - Component test: Accommodation cards show multi-day indicator
  - Component test: Member travel cards display in compact format
  - Component test: Edit/delete buttons visible only for authorized users
  - Component test: formatInTimezone utility produces correct output for different timezones

---

- [ ] Task 8: Create/Edit Dialogs for Itinerary Items

Build forms for creating and editing events, accommodations, and member travel.

- Implement:
  - Create `apps/web/src/components/itinerary/create-event-dialog.tsx`:
    - Dialog with React Hook Form + Zod validation (createEventSchema)
    - Fields: name (text), description (textarea), eventType (select: travel/meal/activity), location (text), startTime (datetime-local), endTime (datetime-local, optional), allDay (checkbox), isOptional (checkbox), links (dynamic array input)
    - Uses useCreateEvent hook for submission
    - Shows validation errors inline
    - Disables submit button during mutation (isPending)
    - Closes dialog on success
  - Create `apps/web/src/components/itinerary/edit-event-dialog.tsx`:
    - Similar to create dialog but pre-fills form with existing event data
    - Uses useUpdateEvent hook
  - Create `apps/web/src/components/itinerary/create-accommodation-dialog.tsx`:
    - Fields: name (text), address (text), description (textarea), checkIn (date), checkOut (date), links (dynamic array)
    - Uses useCreateAccommodation hook
    - Validation: checkOut > checkIn
  - Create `apps/web/src/components/itinerary/edit-accommodation-dialog.tsx`:
    - Pre-fills form with existing accommodation data
    - Uses useUpdateAccommodation hook
  - Create `apps/web/src/components/itinerary/create-member-travel-dialog.tsx`:
    - Fields: travelType (radio: arrival/departure), time (datetime-local), location (text), details (textarea)
    - Uses useCreateMemberTravel hook
  - Create `apps/web/src/components/itinerary/edit-member-travel-dialog.tsx`:
    - Pre-fills form with existing member travel data
    - Uses useUpdateMemberTravel hook
  - Add delete confirmation dialog (reuse existing pattern):
    - "Are you sure you want to delete this [item]? Organizers can restore it later."
    - Calls delete mutation on confirm
  - Add "Add" action buttons to itinerary header:
    - "Add Event" button (visible to members with going status)
    - "Add Accommodation" button (visible to organizers only)
    - "Add My Travel" button (visible to all members)
    - Buttons open respective create dialogs
  - Follow existing dialog patterns from `create-trip-dialog.tsx` and `edit-trip-dialog.tsx`

- Test:
  - Component test: Create dialogs open and close correctly
  - Component test: Form validation works (required fields, date ranges)
  - Component test: Cross-field validation (endTime > startTime, checkOut > checkIn)
  - Component test: Submit button disabled during mutation
  - Component test: Success toast shown after create/update
  - Component test: Error toast shown on failure
  - Component test: Edit dialogs pre-fill correctly
  - Component test: Delete confirmation dialog shows warning message
  - Component test: Action buttons visible only for authorized users

---

- [ ] Task 9: E2E Tests for Itinerary Flows

Write Playwright E2E tests covering complete user journeys.

- Implement:
  - Create `apps/web/tests/e2e/itinerary-flows.spec.ts`:
    - Test: Organizer creates event (meal type) for trip
      - Navigate to trip detail page
      - Click "Add Event" button
      - Fill form: name, meal type, location, startTime, endTime
      - Submit and verify event appears in day-by-day view
      - Verify success toast
    - Test: Organizer creates accommodation for trip
      - Click "Add Accommodation" button
      - Fill form: name, address, checkIn, checkOut
      - Submit and verify accommodation appears in itinerary
    - Test: Member adds member travel (arrival)
      - Click "Add My Travel" button
      - Select "Arrival" type, enter time and location
      - Submit and verify arrival appears in day-by-day view
    - Test: Toggle view mode from day-by-day to group-by-type
      - Click view mode toggle
      - Verify events grouped by type (Travel, Meals, Activities)
      - Verify accommodations in separate section
      - Verify member travel NOT in group-by-type view
    - Test: Toggle timezone from trip to user
      - Click timezone toggle
      - Verify times displayed in user's timezone
      - Verify timezone indicator shows "Your timezone (PST)"
      - Toggle back to trip timezone
      - Verify times displayed in trip's timezone
    - Test: Organizer soft deletes event
      - Click delete button on event card
      - Confirm deletion in dialog
      - Verify event disappears from itinerary
      - Navigate to "Deleted Items" section (if visible)
      - Verify event listed as deleted
    - Test: Organizer restores deleted event
      - Click restore button on deleted event
      - Verify event reappears in itinerary
    - Test: Non-member cannot add event (permission check)
      - Log in as non-member user
      - Navigate to trip detail page
      - Verify "Add Event" button not visible
      - Attempt direct API call (should return 403 Forbidden)
    - Test: Member with "not going" status cannot add event
      - Change RSVP status to "Not Going"
      - Verify "Add Event" button disabled or hidden
    - Test: Responsive layout on mobile
      - Resize viewport to mobile size
      - Verify itinerary header stacks vertically
      - Verify cards display correctly
      - Verify forms are usable on small screens

- Test:
  - All E2E tests pass in headless mode: `pnpm test:e2e`
  - All E2E tests pass in UI mode: `pnpm test:e2e:ui`

---

- [ ] Task 10: Manual Browser Testing with Screenshots

Perform comprehensive manual testing using Playwright and capture visual proof.

- Implement:
  - Write manual testing script (or use Playwright REPL):
    - Start local dev environment: `pnpm dev`
    - Seed database with test data (trips, members, events, accommodations)
    - Open Playwright inspector: `npx playwright test --debug`
  - Test scenarios and capture screenshots:
    - Day-by-day view (desktop): Full itinerary with accommodations, arrivals, departures, events
      - Screenshot: `.ralph/screenshots/day-by-day-view-desktop.png`
    - Day-by-day view (mobile): Same itinerary on mobile viewport
      - Screenshot: `.ralph/screenshots/day-by-day-view-mobile.png`
    - Group-by-type view (desktop): All events grouped by type
      - Screenshot: `.ralph/screenshots/group-by-type-view-desktop.png`
    - Timezone toggle (before/after): Side-by-side comparison showing time conversion
      - Screenshot: `.ralph/screenshots/timezone-toggle-before.png` and `.ralph/screenshots/timezone-toggle-after.png`
    - Create event dialog: Open dialog with all fields visible
      - Screenshot: `.ralph/screenshots/create-event-dialog.png`
    - Accommodation multi-day display: Accommodation spanning 3+ days in collapsed and expanded states
      - Screenshot: `.ralph/screenshots/accommodation-collapsed.png` and `.ralph/screenshots/accommodation-expanded.png`
    - Member travel arrivals: Day showing 3+ member arrivals
      - Screenshot: `.ralph/screenshots/member-travel-arrivals.png`
    - Member travel departures: Day showing 3+ member departures
      - Screenshot: `.ralph/screenshots/member-travel-departures.png`
    - Edit event dialog: Pre-filled form for existing event
      - Screenshot: `.ralph/screenshots/edit-event-dialog.png`
    - Delete confirmation: Dialog asking to confirm deletion
      - Screenshot: `.ralph/screenshots/delete-confirmation.png`
    - Deleted items section (if implemented): List of soft-deleted events
      - Screenshot: `.ralph/screenshots/deleted-items-section.png`
    - Responsive tablet layout: Itinerary view on tablet-sized viewport
      - Screenshot: `.ralph/screenshots/itinerary-tablet.png`
    - Empty itinerary state: Trip with no events/accommodations
      - Screenshot: `.ralph/screenshots/empty-itinerary.png`
  - Verify visual design consistency:
    - Colors match Mediterranean theme (Azure blue, terracotta, warm cream)
    - Typography uses Playfair Display for titles, DM Sans for body
    - Spacing and borders follow design system
    - Touch targets are at least 44px on mobile

- Test:
  - Manual test checklist completed (all scenarios tested)
  - All screenshots captured and saved to `.ralph/screenshots/`
  - Screenshots tracked in git (not gitignored)
  - Visual design verified against DESIGN.md
  - Accessibility checks (keyboard navigation, focus rings, ARIA labels)

---

- [ ] Task 11: Documentation and Deployment Preparation

Update documentation and prepare for deployment.

- Implement:
  - Update `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md`:
    - Change status from "Phase 4: Pending" to "Phase 4: Complete"
    - Document new tables (events, accommodations, member_travel)
    - Document new API endpoints
    - Document new frontend components
    - Update implementation progress section
  - Update `CLAUDE.md` (if needed):
    - Add any new development workflow notes
    - Document itinerary testing commands
  - Update `README.md`:
    - Mention Phase 4 features in overview
  - Create database backup before deployment:
    - Document backup procedure in `docs/deployment.md`
  - Verify migration order and dependencies:
    - Review all Drizzle migrations in `apps/api/src/db/migrations/`
    - Test migrations on clean database
  - Update `.env.example` files if new environment variables added
  - Run final checks:
    - `pnpm lint` - No linting errors
    - `pnpm typecheck` - No TypeScript errors
    - `pnpm test` - All tests pass
    - `pnpm test:e2e` - All E2E tests pass
  - Tag release (if applicable):
    - `git tag phase-4-complete`
    - `git push --tags`

- Test:
  - Documentation reviewed and accurate
  - All tests pass in CI/CD pipeline (if applicable)
  - Migrations tested on staging environment
  - No environment variable issues on deployment

---

## Summary

**Total Tasks**: 11 large-grained tasks covering:

1. Database schema and migrations
2. Shared validation schemas
3. Permissions service extensions
4. Backend services (events, accommodations, member travel)
5. API endpoints
6. Frontend data hooks (TanStack Query)
7. Itinerary view components (day-by-day, group-by-type)
8. Create/edit dialogs for itinerary items
9. E2E tests for itinerary flows
10. Manual browser testing with screenshots
11. Documentation and deployment preparation

**Estimated Effort**: Each task is substantial and covers a complete feature area. This breakdown prioritizes shipping complete functionality over granular checkpoints, reducing coordination overhead while maintaining clear deliverables.

**Testing Approach**: All levels (unit, integration, component, E2E, manual) are integrated into each task where applicable, ensuring quality gates are met incrementally.

**Critical Path**: Tasks 1-5 (backend) must complete before tasks 6-8 (frontend). Tasks 9-10 (testing) can begin once features are implemented. Task 11 (documentation) is final.
