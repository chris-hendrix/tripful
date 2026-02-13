# Phase 6: Advanced Itinerary & Trip Management - Tasks

## Phase 1: Schema & Migration

- [x] Task 1.1: Add meetup fields to events schema, shared types, and generate migration
  - Implement: Add `meetupLocation` (text, nullable) and `meetupTime` (timestamp with timezone, nullable) to events table in `apps/api/src/db/schema/index.ts`
  - Implement: Update `baseEventSchema` in `shared/schemas/event.ts` — add `meetupLocation: z.string().max(200).optional()` and `meetupTime: z.string().datetime().optional()`
  - Implement: Update `eventResponseSchema` in `shared/schemas/event.ts` — add `meetupLocation: z.string().nullable()` and `meetupTime: z.string().nullable()`
  - Implement: Update Event TypeScript types in `shared/types/` if separate from schema inference
  - Implement: Generate migration with `cd apps/api && pnpm db:generate`
  - Implement: Apply migration with `cd apps/api && pnpm db:migrate`
  - Test: Run `pnpm typecheck` to verify schema compiles across all packages
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 2: Meetup Location/Time Feature

- [x] Task 2.1: Backend and frontend support for meetup fields on events
  - Implement: Verify EventService passes meetup fields through to DB on create/update (may need no changes if pass-through is generic)
  - Implement: Add meetup fields to event route response schemas in `apps/api/src/routes/event.routes.ts` if needed
  - Implement: Add meetup location and meetup time form fields to `apps/web/src/components/itinerary/create-event-dialog.tsx` after the end time section
  - Implement: Add meetup location and meetup time form fields to `apps/web/src/components/itinerary/edit-event-dialog.tsx` with pre-populated values
  - Implement: Display meetup info on `apps/web/src/components/itinerary/event-card.tsx` in expanded view — "Meet at {location} at {time}" with Users icon
  - Test: Write integration test for creating event with meetup fields and reading them back
  - Test: Write integration test for updating event meetup fields
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 3: Auto-Lock Past Trips

- [x] Task 3.1: Backend auto-lock and frontend read-only UI for past trips
  - Implement: Add `isTripLocked(tripId)` method to `apps/api/src/services/permissions.service.ts` — returns true when trip end date has passed
  - Implement: Add lock check to event create/update/delete routes in `apps/api/src/routes/event.routes.ts` — return 403 "This trip has ended and is now read-only"
  - Implement: Add lock check to accommodation create/update/delete routes in `apps/api/src/routes/accommodation.routes.ts`
  - Implement: Add lock check to member travel create/update/delete routes in `apps/api/src/routes/member-travel.routes.ts`
  - Implement: Ensure restore endpoints are NOT locked (events, accommodations, member travel restore remain available)
  - Implement: Add `isLocked` prop computation in `apps/web/src/components/itinerary/itinerary-view.tsx` based on trip end date
  - Implement: Hide FAB when trip is locked
  - Implement: Show read-only banner "This trip has ended. The itinerary is read-only." when locked
  - Implement: Pass `isLocked` to event, accommodation, and member travel card components to hide edit/delete buttons
  - Test: Write unit test for `isTripLocked` with past date, future date, null date
  - Test: Write integration tests for locked trip — verify create/update/delete return 403, verify restore still works
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 4: Remove Member

- [ ] Task 4.1: Backend endpoint and frontend UI for direct member removal
  - Implement: Add `removeMember(userId, tripId, memberId)` method to `InvitationService` in `apps/api/src/services/invitation.service.ts`
  - Implement: Add guard — cannot remove trip creator, cannot remove last organizer
  - Implement: Delete member record from members table and associated invitation record if exists
  - Implement: Register `DELETE /api/trips/:tripId/members/:memberId` route in `apps/api/src/routes/invitation.routes.ts`
  - Implement: Add `useRemoveMember` hook in `apps/web/src/hooks/use-invitations.ts`
  - Implement: Update `apps/web/src/components/trip/members-list.tsx` to pass `member.userId` to `onRemove` instead of requiring `invitationId`
  - Implement: Update `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` to use `useRemoveMember` mutation instead of `revokeInvitation`
  - Test: Write unit test for `removeMember` — happy path, permission denied, last organizer error
  - Test: Write integration test for `DELETE /trips/:tripId/members/:memberId` endpoint
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 5: Deleted Items & Restore UI

- [ ] Task 5.1: Deleted items section at bottom of itinerary with restore functionality
  - Implement: Update event/accommodation/member-travel hooks to pass `includeDeleted: true` query param when user is organizer
  - Implement: Create `DeletedItemsSection` component in `apps/web/src/components/itinerary/deleted-items-section.tsx`
  - Implement: Filter fetched items client-side to separate active vs deleted items (by `deletedAt !== null`)
  - Implement: Render collapsible section at bottom of itinerary in `apps/web/src/components/itinerary/itinerary-view.tsx`, visible only to organizers
  - Implement: Group deleted items by type (Events, Accommodations, Member Travel) with item name, deletion date, and Restore button
  - Implement: Wire restore buttons to existing `useRestoreEvent()`, `useRestoreAccommodation()`, `useRestoreMemberTravel()` hooks
  - Implement: Show success toast on restore, auto-collapse section if no more deleted items
  - Test: Manual test — create items, delete them, verify they appear in Deleted Items section, restore and verify they return to itinerary
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 6: Multi-Day Event Badges

- [ ] Task 6.1: Multi-day event badges in day-by-day and group-by-type views
  - Implement: Add `isMultiDay` computation to `apps/web/src/components/itinerary/event-card.tsx` — check if endTime exists and is on a different day than startTime using `getDayInTimezone`
  - Implement: Render date range Badge (e.g., "Feb 10–12") on multi-day events in both compact and expanded views
  - Implement: Ensure badge shows in both day-by-day and group-by-type view modes
  - Test: Manual test — create multi-day event, verify badge appears with correct date range
  - Verify: Run full test suite (`pnpm test`), all tests pass

## Phase 7: E2E Tests & Final Verification

- [ ] Task 7.1: E2E tests for all Phase 6 features
  - Test: Write E2E test — organizer views Deleted Items section and restores a deleted event
  - Test: Write E2E test — past trip shows read-only banner, FAB hidden, edit/delete buttons hidden
  - Test: Write E2E test — organizer removes a member, member's events show "no longer attending"
  - Test: Write E2E test — create event with meetup location/time, verify display on event card
  - Test: Write E2E test — multi-day event shows date range badge in day-by-day view
  - Verify: Run full E2E suite (`pnpm test:e2e`), all tests pass
  - Verify: Run full unit/integration suite (`pnpm test`), all tests pass

- [ ] Task 7.2: Final regression check
  - Verify: All unit tests pass (`pnpm test`)
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: Type checking passes (`pnpm typecheck`)
