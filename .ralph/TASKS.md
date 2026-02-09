# Phase 5: Invitations & RSVP - Tasks

## Phase 1: Database & Permissions Foundation

- [x] Task 1.1: Add isOrganizer column to members table and create invitations table
  - Implement: Add `isOrganizer` boolean column (default false) to members table in `apps/api/src/db/schema/index.ts`
  - Implement: Add `invitationStatusEnum` and `invitations` table to schema
  - Implement: Run `pnpm db:generate` to create migration SQL
  - Implement: Edit migration to include data fixup: `UPDATE members SET is_organizer = true FROM trips WHERE members.trip_id = trips.id AND members.user_id = trips.created_by`
  - Implement: Run `pnpm db:migrate` to apply
  - Test: Write integration test verifying migration: existing trip creators have `isOrganizer=true`, other members have `isOrganizer=false`
  - Test: Write integration test verifying invitations table exists with correct columns
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [x] Task 1.2: Update PermissionsService to use isOrganizer column
  - Implement: Change `isOrganizer()` method to check `members.isOrganizer=true` instead of `members.status='going'`
  - Implement: Update `canAddEvent()` to separate organizer check (isOrganizer) from member check (status='going' + allowMembersToAddEvents)
  - Implement: Update `canEditEvent()` so event creators can only edit if their member status is still 'going'
  - Implement: Add `canInviteMembers()`, `canUpdateRsvp()`, `canViewFullTrip()` methods
  - Test: Update all existing permissions unit tests to account for `isOrganizer` column
  - Test: Write new unit tests for `canInviteMembers`, `canUpdateRsvp`, `canViewFullTrip`
  - Test: Write tests verifying event creator with status='maybe' cannot edit their events
  - Verify: All existing tests pass (no regressions), `pnpm typecheck` passes

- [x] Task 1.3: Update TripService for isOrganizer column
  - Implement: Update `createTrip()` to set `isOrganizer: true` for creator's member record
  - Implement: Update `addCoOrganizers()` to set `isOrganizer: true` for co-organizer member records
  - Implement: Update `getTripById()` to detect organizers via `isOrganizer` column
  - Implement: Update `getUserTrips()` to detect organizers via `isOrganizer` column
  - Test: Update existing trip service unit tests
  - Test: Update existing trip integration tests
  - Verify: All tests pass, `pnpm typecheck` passes

## Phase 2: Shared Schemas & Types

- [ ] Task 2.1: Add invitation and RSVP schemas and types to shared package
  - Implement: Create `shared/schemas/invitation.ts` with `createInvitationsSchema` and `updateRsvpSchema`
  - Implement: Create `shared/types/invitation.ts` with `Invitation`, `MemberWithProfile`, response types
  - Implement: Update `shared/types/event.ts` to add `creatorAttending`, `creatorName`, `creatorProfilePhotoUrl` fields to Event type
  - Implement: Update `shared/types/trip.ts` to add `isPreview`, `userRsvpStatus`, `isOrganizer` to trip response types
  - Implement: Update barrel exports in `shared/schemas/index.ts` and `shared/types/index.ts`
  - Test: Write schema validation tests for `createInvitationsSchema` (valid/invalid phone arrays, limits)
  - Test: Write schema validation tests for `updateRsvpSchema` (valid/invalid statuses)
  - Verify: `pnpm typecheck` passes across all packages, `pnpm test` passes

## Phase 3: Backend API Endpoints

- [ ] Task 3.1: Create InvitationService with batch invite and RSVP logic
  - Implement: Create `apps/api/src/services/invitation.service.ts` with `IInvitationService` interface
  - Implement: Implement `createInvitations()` - validate organizer, check 25 member limit, skip duplicates, create invitation + member records, mock SMS
  - Implement: Implement `getInvitationsByTrip()` - return invitations with invitee names where available
  - Implement: Implement `revokeInvitation()` - organizer-only, delete invitation and associated member record
  - Implement: Implement `updateRsvp()` - update member status, return updated member with profile
  - Implement: Implement `getTripMembers()` - return members with profiles, phone numbers only for organizers
  - Implement: Implement `processPendingInvitations()` - for auth flow: find invitations by phone, create member records
  - Implement: Create `apps/api/src/plugins/invitation-service.ts` plugin
  - Implement: Register plugin in `apps/api/src/app.ts`
  - Test: Write unit tests for all InvitationService methods (success cases, error cases, edge cases)
  - Test: Test batch invite with mix of existing users, new users, already-invited users
  - Test: Test 25 member limit enforcement
  - Test: Test RSVP status changes
  - Verify: `pnpm test` passes, `pnpm typecheck` passes

- [ ] Task 3.2: Create invitation and RSVP route endpoints
  - Implement: Create `apps/api/src/controllers/invitation.controller.ts`
  - Implement: Create `apps/api/src/routes/invitation.routes.ts` with POST/GET/DELETE invitation routes and POST RSVP route
  - Implement: Register routes in `apps/api/src/app.ts` with prefix `/api`
  - Implement: Add GET `/api/trips/:tripId/members` endpoint for member list
  - Test: Write integration tests for POST `/api/trips/:tripId/invitations` (batch invite, validation, limits, permissions)
  - Test: Write integration tests for GET `/api/trips/:tripId/invitations` (organizer-only access)
  - Test: Write integration tests for DELETE `/api/trips/:tripId/invitations/:id` (organizer-only, cascade)
  - Test: Write integration tests for POST `/api/trips/:tripId/rsvp` (status changes, permissions)
  - Test: Write integration tests for GET `/api/trips/:tripId/members` (access control, phone number visibility)
  - Verify: `pnpm test` passes, `pnpm typecheck` passes

- [ ] Task 3.3: Modify trip and event endpoints for preview and creatorAttending
  - Implement: Update `getTripById` in TripService to return partial preview for non-Going members (isPreview: true, no itinerary data reference)
  - Implement: Update trip controller to pass through `isPreview` and `userRsvpStatus` fields
  - Implement: Update EventService `getEventsByTrip()` to join with members table and include `creatorAttending`, `creatorName`, `creatorProfilePhotoUrl` on each event
  - Implement: Integrate `processPendingInvitations` into auth flow (auth service or auth routes after verify-code)
  - Test: Write integration test: uninvited user gets 404, invited non-Going member gets preview, Going member gets full data
  - Test: Write integration test: events include `creatorAttending` field
  - Test: Write integration test: after creator changes RSVP to 'maybe', creatorAttending=false on their events
  - Verify: All tests pass, `pnpm typecheck` passes

## Phase 4: Frontend - Invitation & RSVP UI

- [ ] Task 4.1: Add frontend hooks and update types for invitations, RSVP, and members
  - Implement: Create `apps/web/src/hooks/invitation-queries.ts` with query key factory
  - Implement: Create `apps/web/src/hooks/use-invitations.ts` with `useInviteMembers`, `useInvitations`, `useRevokeInvitation`
  - Implement: Create `apps/web/src/hooks/member-queries.ts` with query key factory
  - Implement: Create `apps/web/src/hooks/use-members.ts` with `useMembers`, `useUpdateRsvp`
  - Implement: Update `useTripDetail` hook to handle `isPreview` response shape
  - Implement: Update event hooks to include `creatorAttending` field
  - Test: Verify TypeScript compilation (`pnpm typecheck`)
  - Verify: `pnpm typecheck` passes, no runtime errors in dev mode

- [ ] Task 4.2: Build TripPreview component and conditional rendering on trip detail page
  - Implement: Create `apps/web/src/components/trip/trip-preview.tsx` showing trip name, destination, dates, description, cover image, organizer info, RSVP buttons
  - Implement: Update `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` to check `isPreview` and render TripPreview or full detail accordingly
  - Implement: After RSVPing "Going", invalidate trip query to refresh and show full itinerary
  - Implement: Style RSVP buttons (Going = primary, Maybe = outline, Not Going = ghost)
  - Test: Manual test: visit trip as invited non-Going member, see preview, RSVP Going, see full itinerary
  - Verify: `pnpm typecheck` passes, responsive on mobile and desktop

- [ ] Task 4.3: Build InviteMembersDialog with batch phone input
  - Implement: Create `apps/web/src/components/trip/invite-members-dialog.tsx`
  - Implement: Phone number input using existing PhoneInput component
  - Implement: "Add" button that appends to a list of phone numbers (shown as removable chips/badges)
  - Implement: Submit sends batch invite via `useInviteMembers` mutation
  - Implement: Show results: success count, skipped count, errors via toast
  - Implement: Add "Invite Members" button to trip detail page (organizer-only, visible in header or settings area)
  - Implement: Use React Hook Form + Zod (createInvitationsSchema)
  - Test: Manual test: add multiple phones, submit, verify invitations created
  - Verify: `pnpm typecheck` passes, form validation works

- [ ] Task 4.4: Build MembersList component as tab on trip detail page
  - Implement: Create `apps/web/src/components/trip/members-list.tsx`
  - Implement: Show member avatars, display names, RSVP status badges (Going=green, Maybe=yellow, Not Going=red, No Response=gray)
  - Implement: Show "Organizer" badge for organizers
  - Implement: Organizer-only features: phone numbers, invite button, remove member action
  - Implement: Add Members tab/section to trip detail page (alongside Itinerary)
  - Test: Manual test: view member list as organizer vs regular member
  - Verify: `pnpm typecheck` passes, responsive layout

- [ ] Task 4.5: Add "member no longer attending" indicator to event cards
  - Implement: Update `apps/web/src/components/itinerary/event-card.tsx` to check `creatorAttending` field
  - Implement: When `creatorAttending === false`, show a muted badge/indicator: "Member no longer attending"
  - Implement: Dim/mute the creator name/avatar area when not attending
  - Test: Manual test: member RSVPs "Maybe", their events show indicator, member RSVPs "Going" again, indicator removed
  - Verify: `pnpm typecheck` passes

## Phase 5: E2E Tests & Regression

- [ ] Task 5.1: Create E2E test helpers for invitation flow
  - Implement: Create `apps/web/tests/e2e/helpers/invitations.ts` with `inviteAndAcceptViaAPI()` helper
  - Implement: Helper calls invite endpoint + authenticates invitee + calls RSVP endpoint via API shortcuts
  - Implement: Helper handles both new and existing users
  - Test: Verify helper works by using it in a simple test
  - Verify: Helper integrates cleanly with existing `authenticateViaAPI` pattern

- [ ] Task 5.2: Update existing E2E tests for isOrganizer permission model
  - Implement: Review `trip-journey.spec.ts` - update co-organizer tests if any break
  - Implement: Review `itinerary-journey.spec.ts` - update any tests that rely on status='going' for permissions
  - Implement: Review `app-shell.spec.ts` and `auth-journey.spec.ts` for any impacts
  - Implement: Use `inviteAndAcceptViaAPI` helper where tests need non-creator members
  - Test: Run full E2E suite: `pnpm test:e2e`
  - Verify: All existing E2E tests pass without failures

- [ ] Task 5.3: Write new E2E tests for invitation and RSVP journey
  - Implement: Create `apps/web/tests/e2e/invitation-journey.spec.ts`
  - Implement: Test 1 "invitation and RSVP journey": organizer invites via UI dialog, invited member sees preview, RSVPs Going, sees full itinerary
  - Implement: Test 2 "RSVP status change and member indicator": member RSVPs Going, creates event, changes to Maybe, event shows indicator, changes back to Going, indicator removed
  - Implement: Test 3 "uninvited user access": uninvited user visits trip URL, sees 404
  - Implement: Test 4 "member list": organizer views member list with statuses, sees invite button
  - Test: Run `pnpm test:e2e` - all tests pass
  - Verify: All E2E tests pass, screenshots captured for manual verification

## Phase 6: Final Verification

- [ ] Task 6.1: Full regression check
  - Verify: `pnpm lint` passes
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm test` passes (all unit + integration tests)
  - Verify: `pnpm test:e2e` passes (all E2E tests)
  - Verify: Manual smoke test of full invitation flow in browser with screenshots
