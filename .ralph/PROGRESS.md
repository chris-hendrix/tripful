# Ralph Progress

Tracking implementation progress for this project.

## Iteration 1 — Task 1.1: Implement backend co-organizer promote/demote

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Created `shared/schemas/member.ts` with `updateMemberRoleSchema` (`{ isOrganizer: boolean }`) and `UpdateMemberRoleInput` type
- Exported from `shared/schemas/index.ts`
- Added `CannotDemoteCreatorError` (400) and `CannotModifyOwnRoleError` (400) to `apps/api/src/errors.ts`
- Extended `IInvitationService` interface with `updateMemberRole` method signature
- Implemented `updateMemberRole(userId, tripId, memberId, isOrganizer)` in `InvitationService` with:
  - Organizer permission check via `permissionsService.isOrganizer()`
  - Target member existence check (by memberId + tripId)
  - Self-modification prevention
  - Trip creator protection (cannot change creator's role)
  - Last-organizer guard (cannot demote if only 1 organizer remains)
  - Returns `MemberWithProfile` with updated `isOrganizer` value
- Added `updateMemberRole` handler to `apps/api/src/controllers/trip.controller.ts` with audit logging
- Registered `PATCH /api/trips/:tripId/members/:memberId` route in `apps/api/src/routes/trip.routes.ts` (write scope with auth + rate limiting)

### Tests written
- **Unit tests** (`apps/api/tests/unit/update-member-role.test.ts`): 13 tests covering happy path promote/demote, MemberWithProfile shape, creator protection, self-modification, non-organizer, non-member, non-existent trip, non-existent member, cross-trip member ID, last organizer guard, multi-organizer demotion
- **Integration tests** (`apps/api/tests/integration/update-member-role.routes.test.ts`): 10 tests covering HTTP-level promote/demote, 403 non-organizer, 400 creator change, 400 self-modify, 404 non-existent member, 401 unauthenticated, 400 invalid body, 400 last organizer, 400 invalid UUID format

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,760 tests — shared: 193, api: 763, web: 804)
- Reviewer: ✅ APPROVED

### Learnings for future iterations
- The `invitationService` manages member CRUD (not `tripService`), but the route lives in `trip.routes.ts` — this is consistent with how co-organizer management routes are organized
- No DB migration was needed — `isOrganizer` column already exists on `members` table
- Integration tests use `app.inject()` + `cookies: { auth_token: token }` for authenticated requests
- The `updateRsvpResponseSchema` was reused for the response since the shape is identical (`{ success: true, member: MemberWithProfile }`)
- Lint caught unused imports (`and`, `eq`) in the integration test — always double-check imports after writing tests
- Unit tests instantiate services directly: `new InvitationService(db, permissionsService)`; integration tests use `buildApp()` + HTTP injection

## Iteration 2 — Task 1.2: Implement frontend co-organizer promote/demote UI

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Added `updateRole` key to `memberKeys` in `apps/web/src/hooks/invitation-queries.ts`
- Added `useUpdateMemberRole` mutation hook in `apps/web/src/hooks/use-invitations.ts`:
  - Calls `PATCH /trips/${tripId}/members/${memberId}` with `{ isOrganizer }` body
  - Invalidates invitations, members, trip detail, and trips list caches on settled
- Added `getUpdateMemberRoleErrorMessage` error helper covering: PERMISSION_DENIED, MEMBER_NOT_FOUND, CANNOT_MODIFY_OWN_ROLE, CANNOT_DEMOTE_CREATOR, LAST_ORGANIZER, network errors
- Updated `apps/web/src/components/trip/members-list.tsx`:
  - Replaced standalone X remove button with DropdownMenu (EllipsisVertical trigger)
  - Added `onUpdateRole` and `currentUserId` props
  - Conditional menu items: "Make co-organizer" (ShieldCheck icon) for non-organizers, "Remove co-organizer" (ShieldOff icon) for organizers
  - "Remove from trip" (UserMinus icon, variant="destructive") preserved in dropdown
  - DropdownMenuSeparator between role and remove actions
  - Actions hidden for trip creator and current user rows
- Wired mutation in `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`:
  - `handleUpdateRole` handler with personalized toast messages
  - Passes `onUpdateRole` and `currentUserId` to MembersList

### Tests written
- **Unit tests** (`apps/web/src/components/trip/__tests__/members-list.test.tsx`): 7 new tests — promote option for regular member, demote option for co-organizer, no dropdown for creator, no dropdown for current user, promote callback args, demote callback args, combined role+remove with separator
- **Hook tests** (`apps/web/src/hooks/__tests__/use-invitations.test.tsx`): 10 new tests — PATCH endpoint call, cache invalidation, and error message helper for all 6 error codes + null + network + unknown
- **E2E test** (`apps/web/tests/e2e/trip-journey.spec.ts`): 1 new test — "promote and demote co-organizer via members dialog" covering full flow with toast and badge assertions
- Updated existing tests in `members-list.test.tsx` and `trip-detail-content.test.tsx` for new dropdown UI pattern and mock exports

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,777 tests — shared: 193, api: 763, web: 821)
- Reviewer: ✅ APPROVED

### Learnings for future iterations
- `MembersList` follows a callback-prop pattern (`onRemove`, `onUpdateRole`) where the parent handles mutation logic and toasts — keep this consistent for future member actions
- `DropdownMenuItem` uses `onSelect` handler (not `onClick`) and supports `variant="destructive"` for destructive actions
- When replacing a standalone button with a DropdownMenu, existing tests that look for the button by aria-label need updating to use the dropdown trigger's aria-label instead
- The `trip-detail-content.test.tsx` mock for `@/hooks/use-invitations` needed to include the new exports (`useUpdateMemberRole`, `getUpdateMemberRoleErrorMessage`) to prevent import errors — always update mocks when adding new exports to hoisted modules
- Test count went from 804 to 821 web tests (+17: 7 unit + 10 hook tests)

## Iteration 3 — Task 2.1: Implement backend member travel delegation

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Added optional `memberId: z.string().uuid().optional()` to `createMemberTravelSchema` in `shared/schemas/member-travel.ts` via `.extend()` on the base schema
- Modified `MemberTravelService.createMemberTravel()` in `apps/api/src/services/member-travel.service.ts`:
  - Added delegation branch: if `data.memberId` is provided, checks organizer permission via `permissionsService.isOrganizer()`, validates target member belongs to trip, uses provided memberId
  - If `data.memberId` not provided: keeps existing self-resolution behavior (resolve memberId from userId)
  - Destructures `memberId` out of data before insert to prevent it leaking into DB values
  - Imported `MemberNotFoundError` for invalid delegation targets
- No controller or route changes needed — the existing route already passes `request.body` (typed as `CreateMemberTravelInput`) through to the service, and Fastify validates the optional UUID field via the schema

### Tests written
- **Schema tests** (`shared/__tests__/member-travel-schemas.test.ts`): 3 new tests — valid UUID memberId accepted, absent memberId backward compatibility, invalid memberId format rejected
- **Unit tests** (`apps/api/tests/unit/member-travel.service.test.ts`): 5 new tests in "member travel delegation" describe block — organizer creates travel for another member (happy path), non-organizer cannot delegate (PermissionDeniedError), memberId not in trip (MemberNotFoundError), non-existent memberId (MemberNotFoundError), backward compat without memberId
- **Integration tests** (`apps/api/tests/integration/member-travel.routes.test.ts`): 4 new tests in "Member travel delegation" describe block — POST with memberId as organizer (201), POST with memberId as non-organizer (403), POST with invalid memberId (404), POST without memberId backward compat (201)

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,789 tests — shared: 196, api: 772, web: 821)
- Reviewer: ✅ APPROVED

### Learnings for future iterations
- The controller/route layer does not need modification when adding optional fields to the request body — Zod schema changes propagate through `CreateMemberTravelInput` type automatically
- Permission check order matters for security: check `isOrganizer` BEFORE validating the target member exists, to prevent information leakage about member existence to unauthorized users
- Destructure `memberId` out of `data` before spreading into insert values: `const { memberId: _memberId, ...insertData } = data` prevents schema-only fields from reaching the database
- Lint caught an unused variable (`member1`) in the integration test — always check that destructured variables from `db.insert().returning()` are actually used; if not, skip the destructuring
- Test count: shared 193→196 (+3), api 763→772 (+9), web unchanged at 821; total 1,777→1,789 (+12)
- The `MemberNotFoundError` (404) already existed in `errors.ts` and was reused — no new error classes needed for this feature
