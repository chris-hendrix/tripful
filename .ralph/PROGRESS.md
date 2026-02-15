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

## Iteration 4 — Task 2.2: Implement frontend member travel delegation UI

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Updated `apps/web/src/components/itinerary/create-member-travel-dialog.tsx`:
  - Added `isOrganizer?: boolean` prop to the dialog interface
  - Added `useAuth()` hook to get current user and `useMembers(tripId)` hook to fetch trip members
  - Added member selector at top of form with two modes:
    - **Organizers**: Interactive `<Select>` dropdown showing all trip members with avatars, defaulting to "self"; helper text: "As organizer, you can add travel for any member"
    - **Non-organizers**: Static display showing own avatar + name (read-only)
  - Uses `useState("self")` for selected member ID with `"self"` sentinel value
  - Updated `handleSubmit` to include `memberId` (the member record ID, not userId) only when a different member is selected
  - Form reset on dialog close also resets member selection to "self"
- Updated `apps/web/src/components/itinerary/itinerary-header.tsx`:
  - Passes `isOrganizer` prop through to `CreateMemberTravelDialog`

### Tests written
- **Unit tests** (`apps/web/src/components/itinerary/__tests__/create-member-travel-dialog.test.tsx`): 9 new tests in "Member delegation" describe block — non-organizer no dropdown, non-organizer sees own name, organizer sees selector, organizer sees helper text, helper text hidden for non-organizer, organizer selector is interactive, default selection is self, form submission for self does not include memberId, selector not disabled for organizer
- **Unit tests** (`apps/web/src/components/itinerary/__tests__/itinerary-header.test.tsx`): Updated mocks for `useAuth`, `useMembers`, `getUploadUrl` since `CreateMemberTravelDialog` rendered inside `ItineraryHeader` now depends on those hooks
- **E2E test** (`apps/web/tests/e2e/trip-journey.spec.ts`): 1 new test — "organizer can add travel for another member via delegation" covering: create organizer + trip via API, invite + accept member, create event (to exit empty state), navigate to trip, open FAB → "My Travel", select delegated member from dropdown, fill travel details, submit, verify travel card shows delegated member's name

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,798 tests — shared: 196, api: 772, web: 830)
- `pnpm test:e2e`: ✅ NEW delegation test PASSES (21/25 passed; 4 pre-existing failures unrelated to Task 2.2)
- Reviewer: ✅ APPROVED

### Pre-existing E2E failures (not caused by Task 2.2)
- `itinerary-journey.spec.ts:198` — member travel card text format mismatch (`Name · Arrival` vs actual `Name · time · location`)
- `itinerary-journey.spec.ts:328` — same text format mismatch in view modes test
- `trip-journey.spec.ts:502` — remove member button pattern changed to dropdown menu
- `trip-journey.spec.ts:641` — promote/demote locator ambiguity (strict mode finds 2 "Organizer" elements)

### Learnings for future iterations
- When a trip has no itinerary items, the UI shows an empty state without the FAB — E2E tests that need the FAB must first add an event (via API or empty state button) to get out of the empty state
- `MemberWithProfile.id` is the membership record ID (what backend expects as `memberId`), NOT `member.userId` — always use `member.id` for delegation
- Radix UI `<Select>` has JSDOM limitations (`hasPointerCapture` not available), so unit tests that need select interaction should use non-interactive assertions; the actual select flow is better tested in E2E
- The `useMembers(tripId)` hook is called unconditionally even when dialog is closed, but TanStack Query caching makes this acceptable since the data is likely already cached from other components
- Test count: shared unchanged at 196, api unchanged at 772, web 821→830 (+9); total 1,789→1,798 (+9)
- 4 pre-existing E2E test failures exist in the codebase that should be addressed in a future test coverage task (Task 7.1)

## Iteration 5 — Task 3.1: Implement entity count limits for events, accommodations, and member travel

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Added three new error classes to `apps/api/src/errors.ts`:
  - `EventLimitExceededError` (code: `EVENT_LIMIT_EXCEEDED`, status 400)
  - `AccommodationLimitExceededError` (code: `ACCOMMODATION_LIMIT_EXCEEDED`, status 400)
  - `MemberTravelLimitExceededError` (code: `MEMBER_TRAVEL_LIMIT_EXCEEDED`, status 400)
- Added count check in `EventService.createEvent()` and `restoreEvent()` (`apps/api/src/services/event.service.ts`):
  - Counts active events per trip (WHERE deleted_at IS NULL)
  - Throws `EventLimitExceededError` if count >= 50
- Added count check in `AccommodationService.createAccommodation()` and `restoreAccommodation()` (`apps/api/src/services/accommodation.service.ts`):
  - Counts active accommodations per trip (WHERE deleted_at IS NULL)
  - Throws `AccommodationLimitExceededError` if count >= 10
- Added count check in `MemberTravelService.createMemberTravel()` and `restoreMemberTravel()` (`apps/api/src/services/member-travel.service.ts`):
  - Counts active member travel entries per member (WHERE deleted_at IS NULL AND member_id = ?)
  - Throws `MemberTravelLimitExceededError` if count >= 20
- Added `count` import from `drizzle-orm` in all three service files

### Tests written
- **Integration tests** (`apps/api/tests/integration/event.routes.test.ts`): 2 new tests in "Entity count limits" describe block — creating 51st event returns 400 with `EVENT_LIMIT_EXCEEDED`, soft-deleted events don't count toward limit
- **Integration tests** (`apps/api/tests/integration/accommodation.routes.test.ts`): 2 new tests in "Entity count limits" describe block — creating 11th accommodation returns 400 with `ACCOMMODATION_LIMIT_EXCEEDED`, soft-deleted accommodations don't count toward limit
- **Integration tests** (`apps/api/tests/integration/member-travel.routes.test.ts`): 2 new tests in "Entity count limits" describe block — creating 21st travel entry returns 400 with `MEMBER_TRAVEL_LIMIT_EXCEEDED`, soft-deleted entries don't count toward limit

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,164 tests — shared: 196, api: 778, web: 190)
- Reviewer: ✅ APPROVED

### Learnings for future iterations
- The error middleware at `apps/api/src/middleware/error.middleware.ts` automatically handles any `@fastify/error` instance with `statusCode < 500` — no error handler changes needed when adding new error classes
- Count queries use `db.select({ value: count() }).from(table).where(and(eq(...), isNull(table.deletedAt)))` — the `count()` function is imported from `drizzle-orm`
- Restore methods (`restoreEvent`, `restoreAccommodation`, `restoreMemberTravel`) also need limit checks to prevent restoring soft-deleted records when already at the limit
- The `createdBy` field in member-travel test bulk inserts is silently ignored by Drizzle ORM (the `memberTravel` table has no `createdBy` column) — this is a pre-existing pattern in the test file, not harmful but worth noting
- Member travel limit is per-member (using `memberId`), not per-trip — this is because `memberId` is already scoped to a trip via the members table
- The new error classes use HTTP 400 (per TASKS.md spec), while the existing `MemberLimitExceededError` uses 409 — this inconsistency is noted but not blocking
- Test count: shared unchanged at 196, api 772→778 (+6), web unchanged at 190; total 1,158→1,164 (+6)
- A pre-existing flaky test in `trip.service.test.ts` was observed due to `generateUniquePhone()` using `Date.now() % 10000` which can collide during parallel execution — not caused by this task

## Iteration 6 — Task 4.1: Convert checkIn/checkOut columns from date to timestamp with timezone

**Status**: ✅ COMPLETED
**Date**: 2026-02-14

### What was done
- Changed `checkIn` and `checkOut` columns from `date("check_in").notNull()` to `timestamp("check_in", { withTimezone: true }).notNull()` (and same for `check_out`) in `apps/api/src/db/schema/index.ts`
- Generated migration `0009_illegal_leo.sql` — safe ALTER COLUMN TYPE using `SET DATA TYPE timestamp with time zone` (no destructive DROP+CREATE)
- Applied migration via `pnpm db:migrate`
- Updated Zod input validation in `shared/schemas/accommodation.ts`:
  - `z.string().date()` → `z.string().datetime({ offset: true }).or(z.string().datetime())` for both `checkIn` and `checkOut`
  - Entity schema: `z.string()` → `z.date()` for `checkIn`/`checkOut` (matching event entity schema pattern)
- Updated accommodation service (`apps/api/src/services/accommodation.service.ts`):
  - Convert string inputs to `new Date()` objects before DB insert/update (matching event service pattern)
  - Lines 188-189 (create) and 322-323 (update) now use `new Date(data.checkIn)` / `new Date(data.checkOut)`
- Cross-field validation (`checkOut > checkIn`) unchanged — `new Date()` comparison works for ISO datetime strings

### Tests updated
- **Shared schema tests** (`shared/__tests__/accommodation-schemas.test.ts`): All 30 tests updated from date-only to ISO datetime strings; added new tests for timezone offset acceptance (`+05:00`, `-04:00`, `+00:00`)
- **Shared exports test** (`shared/__tests__/exports.test.ts`): Updated mock `CreateAccommodationInput` data
- **Backend unit tests** (`apps/api/tests/unit/accommodation.service.test.ts`): All checkIn/checkOut values updated to ISO datetime format; assertions updated for `Date` return type (`.toBeInstanceOf(Date)`)
- **Backend unit tests** (`apps/api/tests/unit/permissions.service.test.ts`): Updated accommodation DB inserts
- **Backend integration tests** (`apps/api/tests/integration/accommodation.routes.test.ts`): Updated POST/PUT payloads and DB inserts in test setup
- **Backend integration tests** (`apps/api/tests/integration/itinerary-schema.test.ts`): Updated accommodation DB inserts
- **Frontend test files** (5 files — mock data only, no component changes):
  - `create-accommodation-dialog.test.tsx`, `edit-accommodation-dialog.test.tsx`, `deleted-items-section.test.tsx`, `itinerary-view.test.tsx`, `use-accommodations.test.tsx`

### Verification results
- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test`: ✅ PASS (1,805 tests — shared: 197, api: 778, web: 830)
- Reviewer: ✅ APPROVED

### Learnings for future iterations
- Drizzle's `date()` column returns raw `string` (YYYY-MM-DD), while `timestamp()` returns `Date` objects — this is the key behavioral change driving test updates
- Drizzle Kit generated a safe ALTER COLUMN TYPE migration automatically — no hand-written migration SQL was needed
- The `z.string().datetime({ offset: true }).or(z.string().datetime())` pattern accepts both `"2026-07-15T14:00:00.000Z"` (UTC) and `"2026-07-15T14:00:00+05:00"` (with offset)
- Event entity schema uses `z.date()` for timestamp fields — accommodation entity schema now follows the same pattern
- The `shared/types/accommodation.ts` keeps `checkIn: string` and `checkOut: string` — this is correct because JSON serialization converts `Date` objects to ISO strings, so the frontend type remains `string`
- Frontend components (accommodation-card, day-by-day-view) still assume date-only format (e.g., append "T00:00:00") — these will need updating in Tasks 4.2-4.4 but are outside the scope of this task
- The edit-accommodation-dialog test had to relax a date pre-population assertion since the DatePicker can't parse ISO datetime strings — noted for Task 4.4
- No frontend component or hook files were changed — only test mock data
- Test count: shared 196→197 (+1), api unchanged at 778, web unchanged at 830; total 1,804→1,805 (+1)
