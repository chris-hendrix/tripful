# Tasks: Member Privacy & List UX

## Phase 1: Database & Shared Layer

- [x] Task 1.1: Add database columns, shared schemas, and types
  - Implement: Add `sharePhone` boolean column to members table in `apps/api/src/db/schema/index.ts` (after `isOrganizer`, line 145)
  - Implement: Add `showAllMembers` boolean column to trips table in `apps/api/src/db/schema/index.ts` (after `allowMembersToAddEvents`, line 115)
  - Implement: Run `cd apps/api && pnpm db:generate` to generate migration, review SQL, run `pnpm db:migrate`
  - Implement: In `shared/schemas/invitation.ts` — add `sharePhone: z.boolean().optional()` to `updateRsvpSchema`, add `updateMySettingsSchema` and `mySettingsResponseSchema`
  - Implement: In `shared/schemas/trip.ts` — add `showAllMembers: z.boolean().default(false)` to `baseTripSchema`, make `phoneNumber` optional in `organizerDetailSchema`, add `showAllMembers: z.boolean()` to `tripEntitySchema`
  - Implement: In `shared/schemas/index.ts` — export new schemas and `UpdateMySettingsInput` type
  - Implement: In `shared/types/invitation.ts` — add `sharePhone?: boolean` to `MemberWithProfile`
  - Implement: In `shared/types/trip.ts` — make `phoneNumber` optional in `TripDetail.organizers`, add `showAllMembers: boolean` to `Trip` interface
  - Verify: `pnpm typecheck` passes across all packages
  - Verify: `pnpm lint` passes

- [x] Task 1.2: Phase 1 cleanup
  - Review: Read PROGRESS.md entries for Phase 1 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 2: API Layer

- [x] Task 2.1: Update getTripMembers with privacy filtering and fix getTripById phone leak
  - Implement: In `apps/api/src/services/invitation.service.ts` `getTripMembers()` — add `sharePhone: members.sharePhone` to select, fetch trip's `showAllMembers` setting, filter members to going+maybe when !isOrg && !showAllMembers, include phoneNumber when isOrg || r.sharePhone
  - Implement: In `apps/api/src/services/trip.service.ts` `getTripById()` — conditionally include `phoneNumber` in organizer objects only when `userIsOrganizer` is true, include `showAllMembers` in full (non-preview) response
  - Test: Update existing tests if any break due to type changes
  - Verify: `pnpm typecheck` passes in apps/api
  - Verify: `pnpm test` passes (run full test suite to catch regressions)

- [x] Task 2.2: Extend RSVP endpoint and add my-settings endpoints
  - Implement: In `invitation.service.ts` `updateRsvp()` — accept optional `sharePhone` parameter, include in `.set()` when provided, update `IInvitationService` interface
  - Implement: In `invitation.controller.ts` — destructure `sharePhone` from request body in `updateRsvp` handler, pass to service
  - Implement: Add `getMySettings(userId, tripId)` and `updateMySettings(userId, tripId, sharePhone)` methods to InvitationService
  - Implement: Add controller handlers for my-settings GET and PATCH
  - Implement: In `invitation.routes.ts` — add `GET /trips/:tripId/my-settings` (read route) and `PATCH /trips/:tripId/my-settings` (write scope)
  - Implement: Update `IInvitationService` interface with new method signatures
  - Test: Verify endpoints work with manual curl or verify via typecheck
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm lint` passes
  - Verify: `pnpm test` passes

- [x] Task 2.3: Phase 2 cleanup
  - Review: Read PROGRESS.md entries for Phase 2 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 3: Frontend — UI Fixes & Privacy Controls

- [ ] Task 3.1: Create Venmo icon and update member list UI
  - Implement: Create `apps/web/src/components/icons/venmo-icon.tsx` — inline SVG Venmo V mark, accepts `className`, uses `currentColor`
  - Implement: In `members-list.tsx` — import VenmoIcon, replace Venmo text link (lines 200-210) with `<VenmoIcon className="w-4 h-4" />` inside `<a>` tag
  - Implement: In `members-list.tsx` — remove `first:pt-0 last:pb-0` from row className (line 168)
  - Implement: In `members-list.tsx` — change phone condition from `isOrganizer && member.phoneNumber` to `member.phoneNumber`
  - Test: Update `members-list.test.tsx` — test Venmo icon renders (look for SVG or aria-hidden), test phone shows when phoneNumber present regardless of isOrganizer, verify consistent padding
  - Verify: `pnpm vitest run apps/web/src/components/trip/__tests__/members-list.test.tsx` passes
  - Verify: `pnpm typecheck` passes

- [ ] Task 3.2: Add my-settings hooks and Privacy section in notification preferences
  - Implement: In `apps/web/src/hooks/use-invitations.ts` — add `useMySettings(tripId)` query hook and `useUpdateMySettings(tripId)` mutation hook with `getUpdateMySettingsErrorMessage()` helper
  - Implement: In `notification-preferences.tsx` — import new hooks, add Separator + "Privacy" heading + Switch for "Share phone number" below notification switches
  - Test: Update `use-invitations.test.tsx` — test new hooks make correct API calls
  - Test: Update `notification-preferences.test.tsx` — test Privacy section renders, switch calls mutation
  - Verify: `pnpm vitest run apps/web/src/hooks/__tests__/use-invitations.test.tsx` passes
  - Verify: `pnpm vitest run apps/web/src/components/notifications/__tests__/notification-preferences.test.tsx` passes

- [ ] Task 3.3: Add phone sharing step to onboarding wizard
  - Implement: In `member-onboarding-wizard.tsx` — add `sharePhone` state (default false), insert new Step 0 with Switch + label + description, shift all existing steps by +1, update totalSteps
  - Implement: On wizard completion, pass `sharePhone` to RSVP mutation (extend existing mutation call) or call my-settings endpoint
  - Test: Update `member-onboarding-wizard.test.tsx` — test Step 0 renders with Switch, test step navigation (now 4-5 steps), test sharePhone is included in RSVP call
  - Verify: `pnpm vitest run apps/web/src/components/trip/__tests__/member-onboarding-wizard.test.tsx` passes

- [ ] Task 3.4: Add showAllMembers toggle to edit trip dialog
  - Implement: In `edit-trip-dialog.tsx` — add `showAllMembers` to defaultValues and form.reset(), add Checkbox FormField after allowMembersToAddEvents with label and description
  - Test: Update `edit-trip-dialog.test.tsx` — test checkbox renders, test form submission includes showAllMembers value
  - Verify: `pnpm vitest run apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx` passes

- [ ] Task 3.5: Phase 3 cleanup
  - Review: Read PROGRESS.md entries for Phase 3 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 4: Final Verification

- [ ] Task 4.1: Full regression check
  - Verify: `pnpm typecheck` — all packages compile with 0 errors
  - Verify: `pnpm lint` — 0 errors
  - Verify: `pnpm test` — all unit tests pass
  - Verify: `pnpm test:e2e` — E2E tests pass (no regressions)
