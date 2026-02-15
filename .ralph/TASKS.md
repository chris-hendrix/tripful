# Phase 7: Polish & Testing - Tasks

## Phase 1: Co-organizer Promote/Demote

- [x] Task 1.1: Implement backend co-organizer promote/demote
  - Implement: Create `shared/schemas/member.ts` with `updateMemberRoleSchema` (`{ isOrganizer: boolean }`)
  - Implement: Export from `shared/schemas/index.ts`
  - Implement: Add `updateMemberRole(userId, tripId, memberId, isOrganizer)` method to `apps/api/src/services/invitation.service.ts`
    - Verify requesting user is organizer via `permissionsService.isOrganizer()`
    - Verify target member exists in trip
    - Prevent demoting trip creator (`trip.createdBy`)
    - Prevent self-promote/demote
    - Update `isOrganizer` column on members table
    - Return updated member
  - Implement: Add `updateMemberRole` handler to `apps/api/src/controllers/trip.controller.ts`
  - Implement: Add `PATCH /api/trips/:tripId/members/:memberId` route to `apps/api/src/routes/trip.routes.ts`
  - Test: Unit tests for `updateMemberRole` service method (happy path, trip creator check, self-check, non-member, non-organizer)
  - Test: Integration tests for PATCH route (permissions, edge cases, error responses)
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [x] Task 1.2: Implement frontend co-organizer promote/demote UI
  - Implement: Add `useUpdateMemberRole` TanStack Query mutation hook in `apps/web/src/lib/hooks/`
  - Implement: Update `apps/web/src/components/trip/members-list.tsx`:
    - Add dropdown menu (DropdownMenu from shadcn/ui) on each member row for organizers
    - Menu items: "Make Co-organizer" (if not organizer) / "Remove Co-organizer" (if organizer, not trip creator)
    - Also keep existing "Remove from trip" action in dropdown
    - Show toast notification on success/error
  - Implement: Update TanStack Query cache invalidation to refresh members list after role change
  - Test: E2E test in `apps/web/tests/e2e/` - organizer promotes member to co-organizer, then demotes back
  - Verify: `pnpm typecheck` passes, `pnpm test` passes, `pnpm test:e2e` passes

## Phase 2: Member Travel Delegation

- [x] Task 2.1: Implement backend member travel delegation
  - Implement: Add optional `memberId: z.string().uuid().optional()` to `createMemberTravelSchema` in `shared/schemas/member-travel.ts`
  - Implement: Update `MemberTravelService.createMemberTravel()` in `apps/api/src/services/member-travel.service.ts`:
    - If `data.memberId` provided: validate organizer permission, validate memberId is a trip member, use provided memberId
    - If `data.memberId` not provided: keep existing behavior (resolve from userId)
  - Implement: Update entity count limit check (Task 3.1) to use resolved memberId
  - Test: Unit tests for delegation logic (organizer can set memberId, non-organizer cannot, invalid memberId)
  - Test: Integration tests for POST /trips/:tripId/member-travel with memberId parameter
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [x] Task 2.2: Implement frontend member travel delegation UI
  - Implement: Update `apps/web/src/components/itinerary/create-member-travel-dialog.tsx`:
    - Add member selector (Select from shadcn/ui) at top of form
    - Fetch trip members using existing hooks
    - For regular members: show own avatar + name, disabled
    - For organizers: dropdown of all trip members, defaults to self
    - Helper text for organizers: "As organizer, you can add member travel for any member"
    - Pass `memberId` in API request body when organizer selects a different member
  - Implement: Add necessary imports (Avatar, Select components)
  - Test: E2E test - organizer adds member travel for another member, verify it appears with correct member name
  - Verify: `pnpm typecheck` passes, `pnpm test` passes, `pnpm test:e2e` passes

## Phase 3: Entity Count Limits

- [x] Task 3.1: Implement entity count limits for events, accommodations, and member travel
  - Implement: Add error classes to `apps/api/src/errors.ts`:
    - `EventLimitExceededError` (code: `EVENT_LIMIT_EXCEEDED`, status 400, message: "Maximum 50 events per trip reached.")
    - `AccommodationLimitExceededError` (code: `ACCOMMODATION_LIMIT_EXCEEDED`, status 400, message: "Maximum 10 accommodations per trip reached.")
    - `MemberTravelLimitExceededError` (code: `MEMBER_TRAVEL_LIMIT_EXCEEDED`, status 400, message: "Maximum 20 travel entries per member reached.")
  - Implement: In `EventService.createEvent()` (`apps/api/src/services/event.service.ts`):
    - Count active events for trip (WHERE deleted_at IS NULL)
    - Throw `EventLimitExceededError` if count >= 50
  - Implement: In `AccommodationService.createAccommodation()` (`apps/api/src/services/accommodation.service.ts`):
    - Count active accommodations for trip (WHERE deleted_at IS NULL)
    - Throw `AccommodationLimitExceededError` if count >= 10
  - Implement: In `MemberTravelService.createMemberTravel()` (`apps/api/src/services/member-travel.service.ts`):
    - Count active member travel for the specific member (WHERE deleted_at IS NULL AND member_id = ?)
    - Throw `MemberTravelLimitExceededError` if count >= 20
  - Test: Integration test for each limit - create items up to limit, verify next creation fails with correct error
  - Test: Verify soft-deleted items don't count toward limit (delete one, create succeeds)
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 4: Accommodation Redesign

- [x] Task 4.1: Convert checkIn/checkOut columns from date to timestamp with timezone
  - Implement: In `apps/api/src/db/schema/index.ts`, change `checkIn: date("check_in").notNull()` to `checkIn: timestamp("check_in", { withTimezone: true }).notNull()` and same for `checkOut`
  - Implement: Generate migration: `cd apps/api && pnpm db:generate` — verify it generates `ALTER COLUMN ... TYPE timestamp with time zone`
  - Implement: Run migration: `cd apps/api && pnpm db:migrate`
  - Implement: In `shared/schemas/accommodation.ts`, change `checkIn: z.string().date()` to `checkIn: z.string().datetime({ offset: true }).or(z.string().datetime())` and same for `checkOut`
  - Implement: Update existing tests to use ISO datetime strings (e.g. `"2026-03-01T14:00:00.000Z"`) instead of date strings (e.g. `"2026-03-01"`)
  - Test: All existing accommodation tests pass with datetime values
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [ ] Task 4.2: Show accommodations on all spanned days in day-by-day view
  - Implement: In `apps/web/src/components/itinerary/day-by-day-view.tsx`:
    - Change `DayData.accommodation: Accommodation | null` to `DayData.accommodations: Accommodation[]`
    - Initialize as `accommodations: []` in `ensureDay`
    - Change accommodation grouping: iterate each date from `checkIn` to day before `checkOut`, push accommodation to each day's array
    - Update `hasContent` check: `day.accommodations.length > 0` instead of `day.accommodation`
    - Render `day.accommodations.map(...)` at top of each day's card list
    - Update all references from `day.accommodation` to `day.accommodations`
  - Verify: `pnpm typecheck` passes

- [ ] Task 4.3: Redesign accommodation card to minimal style with dropdown
  - Implement: Rewrite `apps/web/src/components/itinerary/accommodation-card.tsx`:
    - Compact state: Small card with subtle accommodation-colored left border, showing: name, nights count, check-in/check-out times if set
    - Expanded state (click to toggle): address (Google Maps link), description, links, created-by info, edit button (opens edit dialog)
    - Remove big bordered card style, use compact pill-like design
    - Keep accessible: role="button", tabIndex, keyboard support
  - Verify: `pnpm typecheck` passes

- [ ] Task 4.4: Add time inputs to create/edit accommodation dialogs
  - Implement: Update `apps/web/src/components/itinerary/create-accommodation-dialog.tsx`:
    - Add `<Input type="time" />` next to each existing DatePicker in a 2-column grid layout
    - Combine selected date + time into ISO datetime string before form submission
    - Labels: "Check-in date" + "Check-in time", "Check-out date" + "Check-out time"
  - Implement: Update `apps/web/src/components/itinerary/edit-accommodation-dialog.tsx`:
    - Same time input additions as create dialog
    - Pre-populate date and time fields by parsing `checkIn`/`checkOut` ISO datetime strings
    - Fix delete button: change from `Button variant="destructive" className="w-full h-12 rounded-xl"` to subtle link: `<button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors ...">`
    - Match the edit-trip-dialog delete button pattern (small Trash2 icon + text, centered, `pt-2`)
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 5: Responsive Design

- [ ] Task 4.1: Audit and fix responsive design across all pages
  - Implement: Use Playwright to navigate each page at mobile (375px), tablet (768px), and desktop (1024px) viewports
  - Implement: Capture screenshots of each page at each breakpoint
  - Implement: Identify and fix layout issues:
    - Content overflow / horizontal scrolling
    - Dialog sizing and usability on mobile
    - Form elements and touch targets
    - Typography scaling
    - Navigation and header layout
    - Trip cards and grid layouts
    - Itinerary cards and expandable sections
  - Implement: Fix all identified CSS/layout issues
  - Test: Re-screenshot all pages to verify fixes
  - Verify: `pnpm typecheck` passes, `pnpm test` passes, screenshots show correct layouts at all breakpoints

## Phase 6: Performance Optimization

- [ ] Task 6.1: Audit and optimize backend performance
  - Implement: Review all service methods for N+1 query patterns
  - Implement: Review database indexes - check that all frequently-queried foreign keys and filter columns have indexes
  - Implement: Optimize slow queries (use JOINs, reduce round-trips)
  - Implement: Review Fastify route handlers for unnecessary async operations
  - Implement: Add any missing database indexes via migration if needed
  - Test: Run integration tests to ensure optimizations don't break functionality
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [ ] Task 6.2: Audit and optimize frontend performance
  - Implement: Review TanStack Query hook configurations (staleTime, gcTime, refetchOnWindowFocus)
  - Implement: Ensure appropriate caching for stable data (members list, trip details)
  - Implement: Check for unnecessary re-renders in key components (itinerary views, member lists)
  - Implement: Run Lighthouse audit and address key findings
  - Implement: Review bundle size and tree-shaking
  - Test: Verify no regressions in E2E tests
  - Verify: `pnpm typecheck` passes, `pnpm test` passes, `pnpm test:e2e` passes

## Phase 7: Test Coverage

- [ ] Task 7.1: Fill test coverage gaps in unit and integration tests
  - Implement: Run `pnpm test -- --coverage` and identify untested service methods and routes
  - Implement: Add missing unit tests for service edge cases and error paths
  - Implement: Add missing integration tests for API error responses and permission checks
  - Implement: Focus on:
    - Permission boundary tests (what non-organizers cannot do)
    - Error response format consistency
    - Edge cases in date/timezone handling
    - Validation error messages
  - Verify: `pnpm test` passes, coverage improved in key areas

## Phase 8: Documentation

- [ ] Task 8.1: Update architecture documentation and create API docs
  - Implement: Update `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md`:
    - Mark Phase 7 as complete
    - Document co-organizer promote/demote endpoint
    - Document member travel delegation changes
    - Document entity count limits
    - Update implementation progress section
  - Implement: Create API documentation (in `docs/` or within ARCHITECTURE.md):
    - List all API endpoints with method, path, description
    - Document request/response schemas for each endpoint
    - Document error codes and permission requirements
    - Document rate limiting configuration
  - Verify: Documentation is accurate and consistent with implementation

## Phase 9: Final Verification

- [ ] Task 9.1: Full regression check
  - Verify: `pnpm lint` passes
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm test` passes (all unit + integration tests)
  - Verify: `pnpm test:e2e` passes (all E2E tests)
  - Verify: No console errors or warnings in dev mode
  - Verify: Manual smoke test of key flows (create trip, invite, RSVP, add events, promote co-organizer, delegate travel)
