# Tasks: Mutuals Invite

## Phase 1: Shared Types & Schemas

- [ ] Task 1.1: Add mutuals types/schemas and update notification/invitation shared code
  - Implement: Create `shared/types/mutuals.ts` with `Mutual` interface and `GetMutualsResponse` type
  - Implement: Export new types from `shared/types/index.ts`
  - Implement: Add `"mutual_invite"` and `"sms_invite"` to `NotificationType` union in `shared/types/notification.ts`
  - Implement: Add `addedMembers: { userId: string; displayName: string }[]` to `CreateInvitationsResponse` in `shared/types/invitation.ts`
  - Implement: Create `shared/schemas/mutuals.ts` with `getMutualsQuerySchema` and `getMutualSuggestionsQuerySchema`
  - Implement: Export new schemas from `shared/schemas/index.ts`
  - Implement: Update `createInvitationsSchema` in `shared/schemas/invitation.ts` to accept optional `phoneNumbers` and optional `userIds` with refinement requiring at least one
  - Test: Verify shared package builds (`pnpm --filter @tripful/shared build`)
  - Test: Write unit tests for the updated `createInvitationsSchema` — phone-only, userId-only, mixed, empty-both-rejected
  - Verify: run full test suite (`pnpm test`), lint, and typecheck pass

## Phase 2: Backend API

- [ ] Task 2.1: Implement mutuals service, controller, and routes with tests
  - Implement: Create `apps/api/src/services/mutuals.service.ts` with `IMutualsService` interface and `MutualsService` class. Core query joins `members` + `users` + `trips` to derive mutuals. Keyset cursor pagination on `(shared_trip_count DESC, display_name ASC, id ASC)`. Support `tripId` filter, `search` prefix filter, and batch-load shared trips for each mutual.
  - Implement: Create `apps/api/src/controllers/mutuals.controller.ts` with `getMutuals` and `getMutualSuggestions` handlers (extract params, call service, return response)
  - Implement: Create `apps/api/src/routes/mutuals.routes.ts` with `GET /mutuals` (authenticate, defaultRateLimit) and `GET /trips/:tripId/mutual-suggestions` (authenticate, requireCompleteProfile, defaultRateLimit)
  - Implement: Register `IMutualsService` on Fastify instance in `apps/api/src/types/index.ts`, wire up in server bootstrap
  - Implement: Register mutuals routes in `apps/api/src/routes/index.ts`
  - Test: Write unit tests for `MutualsService` — core query logic, cursor pagination, search filtering, trip filtering, empty results, shared trips loading
  - Test: Write integration tests for `GET /mutuals` — auth required, paginated response, search, trip filter, empty for new user
  - Test: Write integration tests for `GET /trips/:tripId/mutual-suggestions` — auth + organizer required, excludes existing members, 403 for non-organizer
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 2.2: Extend invitation service for mutual invites and sms_invite notifications with tests
  - Implement: Modify `createInvitations` in `apps/api/src/services/invitation.service.ts` to accept `userIds` parameter
  - Implement: For `userIds` flow — verify each is a mutual (shared trip membership check), check 25-member limit, skip existing trip members, create `members` records with `status: 'no_response'`, send `mutual_invite` notification via `notificationService.createNotification`
  - Implement: For `phoneNumbers` flow — add `sms_invite` notification for existing users who get auto-added as members (after their member record is created)
  - Implement: Update response to include `addedMembers` array
  - Implement: Update controller and route schema to accept the new request body shape
  - Test: Write unit tests — mutual invite creates member + notification, SMS invite creates notification for existing user, mixed invites, member limit enforcement, non-mutual user rejected, skip existing members
  - Test: Write integration tests for `POST /trips/:tripId/invitations` — mutual-only, phone-only (backwards compat), mixed, notification verification
  - Verify: run full test suite, lint, and typecheck pass

## Phase 3: Frontend — Mutuals Page

- [ ] Task 3.1: Implement mutuals page with query hooks, search, filter, and infinite scroll
  - Implement: Create `apps/web/src/hooks/mutuals-queries.ts` with `mutualKeys` query key factory and `mutualsQueryOptions` (infinite query options with cursor pagination)
  - Implement: Create `apps/web/src/hooks/use-mutuals.ts` with `useMutuals(params)` hook using `useInfiniteQuery` and `useMutualSuggestions(tripId)` hook using `useQuery`
  - Implement: Create `apps/web/src/app/(app)/mutuals/page.tsx` — server component with metadata
  - Implement: Create `apps/web/src/app/(app)/mutuals/mutuals-content.tsx` — client component with search input (debounced 300ms), trip filter dropdown (from user's trips), avatar grid, empty state, infinite scroll via intersection observer
  - Test: Write component tests for `mutuals-content.tsx` — renders mutuals, search filters, empty state displayed, loading state
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 3.2: Implement mutual profile sheet and app header menu item
  - Implement: Create `apps/web/src/components/mutuals/mutual-profile-sheet.tsx` — Sheet component showing large avatar, display name, shared trip count, list of shared trips as links to `/trips/:id`
  - Implement: Wire up mutual card click in `mutuals-content.tsx` to open the profile sheet
  - Implement: Add "My Mutuals" menu item to user dropdown in `apps/web/src/components/app-header.tsx` — `<Link href="/mutuals">` with `Users` icon, placed between profile item and separator
  - Test: Write component tests for mutual profile sheet — renders info, trip links work
  - Test: Write component test for app header — "My Mutuals" link present and navigates to /mutuals
  - Verify: run full test suite, lint, and typecheck pass

## Phase 4: Frontend — Invite Dialog & Notifications

- [ ] Task 4.1: Update invite dialog with mutuals picker and notification icons
  - Implement: Update `apps/web/src/components/trip/invite-members-dialog.tsx` — add mutuals section at top (searchable list with checkboxes, avatar, name), selected mutuals as badge chips, divider "Or invite by phone number", existing phone input below. Only show mutuals section if organizer AND suggestions exist. Use `useMutualSuggestions(tripId)` hook.
  - Implement: Update form to use new `createInvitationsSchema` (optional `phoneNumbers` + optional `userIds`). Submit sends both arrays.
  - Implement: Update `apps/web/src/hooks/use-invitations.ts` — `useInviteMembers` mutation accepts new schema shape, invalidates `mutualKeys.suggestion(tripId)` on success
  - Implement: Update `apps/web/src/components/notifications/notification-item.tsx` — add `UserPlus` icon for `mutual_invite` and `sms_invite` types
  - Test: Write component tests for updated invite dialog — mutuals section shown for organizer, hidden for non-organizer, mutual selection works, mixed submit, phone-only submit still works
  - Test: Write E2E test — view mutuals page (user with co-trip history sees mutuals listed)
  - Test: Write E2E test — invite a mutual from trip invite dialog (organizer sees suggestions, selects one, submits, member appears in trip)
  - Verify: run full test suite including E2E, lint, and typecheck pass
  - Verify: manual testing with screenshots — mutuals page layout, invite dialog two-section layout, notification appears after mutual invite

## Phase 5: Cleanup

- [ ] Task 5.1: Triage PROGRESS.md for unaddressed items
  - Review: Read entire PROGRESS.md
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items across ALL phases
  - Fix: Create individual fix tasks in TASKS.md for each outstanding issue
  - Verify: run full test suite

## Phase 6: Final Verification

- [ ] Task 6.1: Full regression check
  - Verify: all unit tests pass (`pnpm test`)
  - Verify: all E2E tests pass (`pnpm test:e2e`)
  - Verify: linting passes (`pnpm lint`)
  - Verify: type checking passes (`pnpm typecheck`)
  - Verify: manual testing — mutuals page, profile sheet, invite dialog, notifications
