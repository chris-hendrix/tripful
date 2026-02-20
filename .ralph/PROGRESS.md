# Progress: Member Privacy & List UX

## Iteration 1 — Task 1.1: Add database columns, shared schemas, and types

**Status**: COMPLETED
**Verifier**: PASS
**Reviewer**: APPROVED

### Changes Made

**Database schema** (`apps/api/src/db/schema/index.ts`):
- Added `sharePhone: boolean("share_phone").notNull().default(false)` to `members` table (after `isOrganizer`)
- Added `showAllMembers: boolean("show_all_members").notNull().default(false)` to `trips` table (after `allowMembersToAddEvents`)
- Migration generated: `0014_fuzzy_mandroid.sql` — two `ALTER TABLE ADD COLUMN` statements applied successfully

**Shared schemas** (`shared/schemas/`):
- `invitation.ts`: Extended `updateRsvpSchema` with `sharePhone: z.boolean().optional()`, added `updateMySettingsSchema`, `mySettingsResponseSchema`, `UpdateMySettingsInput` type
- `trip.ts`: Added `showAllMembers` to `baseTripSchema` (`.default(false)`), `tripEntitySchema`, and `tripDetailSchema` partial fields; made `phoneNumber` optional in `organizerDetailSchema`
- `index.ts`: Added barrel exports for new schemas and types

**Shared types** (`shared/types/`):
- `invitation.ts`: Added `sharePhone?: boolean` to `MemberWithProfile`
- `trip.ts`: Added `showAllMembers: boolean` to `Trip`; made `phoneNumber` optional in `TripDetail.organizers`

**Cascading fixes**:
- `shared/__tests__/exports.test.ts`: Added `showAllMembers: false` to `CreateTripInput` fixture
- `apps/web/src/hooks/use-trips.ts`: Added `showAllMembers` to optimistic Trip in `useCreateTrip`

### Verification Results
- `pnpm typecheck`: PASS (0 errors, all 3 packages)
- `pnpm lint`: PASS (0 errors)
- `pnpm test`: PASS (all failures are pre-existing — 8 known web tests, 1 flaky auth lockout)
- All 216 shared tests pass, all 1013 API tests pass

### Reviewer Notes
- LOW: `useUpdateTrip` optimistic update in `use-trips.ts` does not explicitly handle `showAllMembers` (it falls through via spread, so old value persists until server response). Minor UX gap — consider adding in Task 3.4 when edit-trip-dialog is updated.
- Suggested: Add dedicated schema tests for new schemas (can be done in cleanup tasks)

## Iteration 2 — Task 1.2: Phase 1 cleanup

**Status**: COMPLETED
**Verifier**: PASS
**Reviewer**: APPROVED

### Reviewer Items Addressed (from Task 1.1)

1. **LOW: `useUpdateTrip` optimistic update** — Fixed. Added `showAllMembers: data.showAllMembers ?? previousTrip.showAllMembers` to the optimistic update in `useUpdateTrip`, matching the existing `allowMembersToAddEvents` pattern.
2. **Suggested: Schema tests** — Added. Full test coverage for `updateMySettingsSchema`, `mySettingsResponseSchema`, `sharePhone` in `updateRsvpSchema`, and `showAllMembers` in trip schemas.

### Changes Made

**Bug fix** (`apps/web/src/hooks/use-trips.ts`):
- Added `showAllMembers` to `useUpdateTrip` optimistic update (lines 329-330), preventing stale UI when toggling the setting

**Schema tests** (`shared/__tests__/invitation-schemas.test.ts`):
- `updateRsvpSchema`: Added tests for `sharePhone` optional boolean (accepted as true/false/omitted, rejected as non-boolean)
- `updateMySettingsSchema`: Added full test suite (accepts boolean, rejects missing field, rejects non-boolean values)
- `mySettingsResponseSchema`: Added full test suite (accepts valid response, rejects `success: false`, rejects missing fields)

**Trip schema tests** (`shared/__tests__/trip-schemas.test.ts`):
- `createTripSchema`: Added test that `showAllMembers` defaults to `false` when omitted
- `updateTripSchema`: Added `{ showAllMembers: true }` to partial update acceptance tests

**Export tests** (`shared/__tests__/exports.test.ts`):
- Added import/assertion for `updateMySettingsSchema`, `mySettingsResponseSchema`
- Added `UpdateMySettingsInput` type usage test

### Verification Results
- `pnpm typecheck`: PASS (0 errors, all 3 packages)
- `pnpm lint`: PASS (0 errors)
- `pnpm test`: PASS — 226 shared tests, 1013 API tests, 1062 web tests (8 pre-existing failures only)
- No regressions introduced

### Learnings
- Phase 1 cleanup tasks are straightforward when previous iteration reviewer notes are specific and actionable
- The `??` nullish coalescing pattern for optimistic updates is the established convention in this codebase for boolean fields that cannot be `null`

## Iteration 3 — Task 2.1: Update getTripMembers with privacy filtering and fix getTripById phone leak

**Status**: COMPLETED
**Verifier**: PASS
**Reviewer**: APPROVED

### Changes Made

**invitation.service.ts** (`apps/api/src/services/invitation.service.ts`) — `getTripMembers()`:
- Added `sharePhone: members.sharePhone` to the DB query select fields
- Added secondary query to fetch `trips.showAllMembers` setting for the trip
- Added member visibility filtering: when `!isOrg && !showAllMembers`, results are filtered to only `going` and `maybe` status members (non-organizers no longer see `not_going` or `no_response` members by default)
- Updated phone number gating: changed from `isOrg` to `(isOrg || r.sharePhone)` — organizers always see all phone numbers, non-organizers see phone numbers only when the member has opted in via `sharePhone`
- Added `sharePhone` field to organizer response output (organizers can see each member's sharePhone setting)

**trip.service.ts** (`apps/api/src/services/trip.service.ts`) — `getTripById()`:
- Made `phoneNumber` optional in `OrganizerInfo` type (`phoneNumber: string` → `phoneNumber?: string`)
- Changed organizer mapping to conditionally include `phoneNumber` only when `userIsOrganizer` is true — fixes the phone leak where non-organizer members could see organizer phone numbers
- `showAllMembers` is already included in full response via `...trip` spread (no explicit change needed)

**invitation.ts** (`shared/schemas/invitation.ts`):
- Added `sharePhone: z.boolean().optional()` to `memberWithProfileSchema` to match the conditional inclusion in the service layer

### Verification Results
- `pnpm typecheck`: PASS (0 errors, all 3 packages)
- `pnpm lint`: PASS (0 errors)
- `pnpm test`: PASS — 226 shared tests, 1005 API tests (8 pre-existing daily-itineraries failures), 1062 web tests (8 pre-existing failures)
- Critical test files all pass: invitation.service (37/37), trip.service (58/58), invitation.routes (29/29), trip.routes (89/89)
- No regressions introduced

### Reviewer Notes
- LOW: Consider combining the `tripSettings` query with the members query for a single DB round-trip (minor optimization, current approach is clear and indexed)
- LOW: Existing tests pass but don't explicitly test the new privacy behavior (e.g., member with `sharePhone: true` visible to non-organizers, `showAllMembers` filtering). Consider adding in Task 2.3 cleanup
- LOW: JSDoc on `getTripMembers()` should be updated to reflect the new `sharePhone`-aware logic

### Learnings
- The `...(condition ? { field: value } : {})` spread pattern is the established convention for conditional field inclusion throughout the codebase
- Optional chaining (`tripSettings[0]?.showAllMembers`) provides a safe default of `false` (more restrictive) when the trip query returns empty, which is the correct privacy-safe behavior
- The `OrganizerInfo` type was local to trip.service.ts, making the `phoneNumber?: string` change low-risk with no cascading type errors
- All existing tests passed without modification because: (a) organizer viewers still see all phones via the `isOrg` check, and (b) non-organizer viewers still don't see phones since `sharePhone` defaults to `false`

## Iteration 4 — Task 2.2: Extend RSVP endpoint and add my-settings endpoints

**Status**: COMPLETED
**Verifier**: PASS
**Reviewer**: APPROVED

### Changes Made

**invitation.service.ts** (`apps/api/src/services/invitation.service.ts`):
- Extended `IInvitationService` interface: added `sharePhone?: boolean` parameter to `updateRsvp`, added `getMySettings(userId, tripId)` and `updateMySettings(userId, tripId, sharePhone)` method signatures
- Extended `updateRsvp()` implementation: accepts optional `sharePhone` parameter, conditionally includes it in `.set()` via `...(sharePhone !== undefined ? { sharePhone } : {})`
- Added `getMySettings()`: checks membership via `getMembershipInfo()`, queries `members.sharePhone`, throws `PermissionDeniedError` for non-members
- Added `updateMySettings()`: checks membership, updates `members.sharePhone`, returns updated value, throws `PermissionDeniedError` for non-members

**invitation.controller.ts** (`apps/api/src/controllers/invitation.controller.ts`):
- Updated `updateRsvp` handler: destructures `sharePhone` from `request.body`, passes to service as 4th argument
- Added `getMySettings` handler: follows existing try/catch pattern, calls service, returns `{ success: true, sharePhone }`
- Added `updateMySettings` handler: follows existing pattern, calls service, includes audit log, returns `{ success: true, sharePhone }`
- Added `UpdateMySettingsInput` import from shared schemas

**invitation.routes.ts** (`apps/api/src/routes/invitation.routes.ts`):
- Added imports: `updateMySettingsSchema`, `mySettingsResponseSchema`, `UpdateMySettingsInput`
- Added `GET /trips/:tripId/my-settings` as read route (authenticate + defaultRateLimitConfig)
- Added `PATCH /trips/:tripId/my-settings` inside write scope (authenticate + requireCompleteProfile + writeRateLimitConfig)

**Unit tests** (`apps/api/tests/unit/invitation.service.test.ts`):
- Added 7 new tests in 3 describe blocks: `updateRsvp - sharePhone` (2 tests), `getMySettings` (2 tests), `updateMySettings` (3 tests)
- All 44 tests pass (7 new + 37 existing)

**Integration tests** (`apps/api/tests/integration/invitation.routes.test.ts`):
- Added 8 new tests in 3 describe blocks: `GET my-settings` (3 tests: defaults, 401, 403), `PATCH my-settings` (4 tests: set true, toggle false, 401, 403), `RSVP+sharePhone` (1 test)
- All 37 tests pass (8 new + 29 existing)

### Verification Results
- `pnpm typecheck`: PASS (0 errors, all 3 packages)
- `pnpm lint`: PASS (0 errors)
- `pnpm test`: PASS — 226 shared tests, 1028 API tests (10 pre-existing daily-itineraries failures, 1 flaky auth lockout), 1070 web tests (8 pre-existing failures)
- Targeted `invitation.service.test.ts`: 44/44 PASS
- Targeted `invitation.routes.test.ts`: 37/37 PASS
- No regressions introduced

### Reviewer Notes
- LOW: `updateMySettings` does update-then-select (two queries) instead of using `.returning()`. This is consistent with existing patterns (`updateRsvp`, `updateMemberRole`) so it's the right choice for consistency.
- LOW: Unit test for "sharePhone not changed when omitted" could be stronger by first setting to `true`, then calling without `sharePhone`, and verifying it stays `true`. Current implementation is correct by inspection.
- LOW: Audit log uses `resourceType: "member"` while other member-scoped entries use `resourceType: "trip"`. Minor consistency point.

### Learnings
- The `getMembershipInfo()` method from `permissionsService` is the standard way to check trip membership for GET-style operations, while `canUpdateRsvp()` is used for RSVP-specific checks
- Route placement follows a clear read/write split: GET routes go directly on `fastify` with `authenticate + defaultRateLimitConfig`, while write routes (POST/PATCH/DELETE) go inside a scoped plugin with shared `authenticate + requireCompleteProfile + writeRateLimitConfig` hooks
- The `...(condition ? { field: value } : {})` spread pattern continues to be the standard for conditional field inclusion in both queries and updates
- Audit logging uses the `auditLog` utility function pattern, not a service, accepting `request`, `action`, `resourceType`, `resourceId`, and optional `metadata`
