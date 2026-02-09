# Ralph Progress

Tracking implementation progress for this project.

## Iteration 1 — Task 1.1: Add isOrganizer column to members table and create invitations table

**Status**: ✅ COMPLETE

### What was done

1. **Schema changes** (`apps/api/src/db/schema/index.ts`):
   - Added `isOrganizer: boolean("is_organizer").notNull().default(false)` column to `members` table
   - Added `invitationStatusEnum` with values: `pending`, `accepted`, `declined`, `failed`
   - Created `invitations` table with all required columns (id, tripId, inviterId, inviteePhone, status, sentAt, respondedAt, createdAt, updatedAt)
   - Added indexes on `tripId` and `inviteePhone`, unique constraint on `(tripId, inviteePhone)`
   - Exported `Invitation` and `NewInvitation` inferred types

2. **Relations** (`apps/api/src/db/schema/relations.ts`):
   - Added `invitationsRelations` with `one` references to trips and users
   - Updated `tripsRelations` and `usersRelations` to include `many(invitations)`

3. **Migration** (`apps/api/src/db/migrations/0005_early_zemo.sql`):
   - Auto-generated via `pnpm db:generate`
   - Manually added data fixup SQL: `UPDATE members SET is_organizer = true FROM trips WHERE members.trip_id = trips.id AND members.user_id = trips.created_by`
   - Migration applied successfully via `pnpm db:migrate`

4. **Tests**:
   - Updated `apps/api/tests/unit/schema.test.ts` — added tests for `isOrganizer` column and full `invitations` table schema validation
   - Created `apps/api/tests/integration/migration-isorganizer.test.ts` — 3 tests for default value, explicit setting, and query filtering
   - Created `apps/api/tests/integration/invitations-table.test.ts` — 4 tests for record creation, unique constraint, cascade delete, and status enum values

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test` (API): ✅ PASS (590 tests, 0 failures)
- Reviewer: ✅ APPROVED (no issues)

### Learnings for future iterations

- Drizzle ORM reports UUID columns with `dataType: "string"`, not `"uuid"` — tests should use `"string"` when asserting UUID column types
- Migration generation via `pnpm db:generate` creates idempotent SQL with `IF NOT EXISTS` and exception handlers
- `varchar` import needed to be added to `drizzle-orm/pg-core` imports for the `inviteePhone` column
- No services, controllers, or permissions logic were modified — those are separate tasks (1.2, 1.3)

## Iteration 2 — Task 1.2: Update PermissionsService to use isOrganizer column

**Status**: ✅ COMPLETE

### What was done

1. **PermissionsService changes** (`apps/api/src/services/permissions.service.ts`):
   - Updated `isOrganizer()` method: LEFT JOIN condition changed from `eq(members.status, "going")` to `eq(members.isOrganizer, true)`. The `trips.createdBy` fallback is preserved as a safety net.
   - Refactored `canEditEvent()`: Organizers can edit any event. Event creators can only edit if their member `status='going'`. Creators with `status='maybe'` or `status='not_going'` are blocked. Inlined logic from the now-removed `isEventCreator` and `getEventTripId` private helpers.
   - Added `canInviteMembers()`: delegates to `isOrganizer()` — organizers only.
   - Added `canUpdateRsvp()`: delegates to `isMember()` — any member.
   - Added `canViewFullTrip()`: queries members table for `status='going'` — going members only.
   - Updated `IPermissionsService` interface with 3 new method signatures and JSDoc.
   - Updated all JSDoc comments to reference `isOrganizer=true` instead of `status='going'` for organizer checks.

2. **Permissions test updates** (`apps/api/tests/unit/permissions.service.test.ts`):
   - Added creator as member with `isOrganizer: true` in test setup (creator must be in members table for new `isOrganizer()` logic)
   - Added `isOrganizer: true` to co-organizer member insert
   - Updated edge case tests to toggle `isOrganizer` flag instead of `status`
   - Updated test descriptions to reflect `isOrganizer` column model
   - Added `canInviteMembers` tests: 4 tests (organizer ✓, co-organizer ✓, regular member ✗, non-member ✗)
   - Added `canUpdateRsvp` tests: 3 tests (any member ✓, organizer ✓, non-member ✗)
   - Added `canViewFullTrip` tests: 4 tests (going ✓, maybe ✗, not_going ✗, non-member ✗)
   - Added `canEditEvent - status restrictions` tests: 4 tests (creator maybe ✗, creator not_going ✗, creator going ✓, organizer always ✓)
   - Total: 85 tests, all passing

3. **Trip service test fixes** (`apps/api/tests/unit/trip.service.test.ts`):
   - Added `isOrganizer: true` to 2 co-organizer member inserts in `updateTrip` and `cancelTrip` test suites

4. **Trip routes test fixes** (`apps/api/tests/integration/trip.routes.test.ts`):
   - Added `isOrganizer: true` to 5 co-organizer member inserts across co-organizer update, delete, add co-organizer, remove co-organizer, and remove creator tests

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- Permissions tests: ✅ PASS (85/85 tests)
- `pnpm test` (API): ✅ PASS (605 tests, 0 failures)
- `pnpm test` (shared): ✅ PASS (169 tests, 0 failures)
- `pnpm test` (web): 17 pre-existing failures in date/time picker component tests (unrelated to this task)
- Reviewer: ✅ APPROVED (all feedback addressed)

### Learnings for future iterations

- When changing the organizer determination logic, ALL test files that set up co-organizer members must be updated — not just the permissions test file. The `trip.service.test.ts` and `trip.routes.test.ts` also create co-organizer members.
- The `trips.createdBy` fallback in `isOrganizer()` provides defense-in-depth for cases where the creator's member record might not have `isOrganizer=true`.
- The trip creator MUST have a member record with `isOrganizer: true` in test setups. The old model could check `trips.createdBy` directly, but the new model's primary check is the `members.isOrganizer` column.
- `canAddEvent()` logic was already correctly structured (organizer check → member status check) and did not need changes after `isOrganizer()` was updated.
- 17 web tests (date/time picker components) are pre-existing failures unrelated to Phase 5. These should not block task completion.
- Task 1.3 (TripService changes) must update `createTrip()` to set `isOrganizer: true` for the creator's member record and `addCoOrganizers()` to set `isOrganizer: true` for co-organizer records.

## Iteration 3 — Task 1.3: Update TripService for isOrganizer column

**Status**: ✅ COMPLETE

### What was done

1. **TripService changes** (`apps/api/src/services/trip.service.ts`) — 8 changes across 5 methods:
   - `createTrip()`: Added `isOrganizer: true` to both the creator's member record insert and co-organizer member inserts
   - `getTripById()`: Changed organizer query from `eq(members.status, "going")` to `eq(members.isOrganizer, true)`
   - `getUserTrips()`:
     - Added `isOrganizer: members.isOrganizer` to the `userMemberships` select query
     - Changed batch organizer tracking from `m.status === "going"` to `m.isOrganizer`
     - Changed `membershipMap` to carry both `status` and `isOrganizer`
     - Replaced derived `isOrganizer` computation (`isCreator || isCoOrganizer`) with direct column read (`membership?.isOrganizer ?? false`)
   - `addCoOrganizers()`: Added `isOrganizer: true` to new co-organizer member inserts
   - `getCoOrganizers()`: Changed query from `eq(members.status, "going")` to `eq(members.isOrganizer, true)`
   - Updated all related comments from "status='going'" to "isOrganizer=true" for organizer detection contexts

2. **Unit test updates** (`apps/api/tests/unit/trip.service.test.ts`):
   - `createTrip` tests: Added `isOrganizer: true` assertions for creator and co-organizer member records
   - `getUserTrips` tests: Updated 2 test descriptions from status-based to column-based language
   - `addCoOrganizers` tests: Added `isOrganizer: true` assertion and updated description
   - `getCoOrganizers` tests: Updated member inserts to include `isOrganizer: true`, updated descriptions to reflect column-based filtering

3. **Integration test updates** (`apps/api/tests/integration/trip.routes.test.ts`):
   - Added `isOrganizer: true` to all manually-inserted member records that represent organizers across all test sections (GET /api/trips, GET /api/trips/:id, PUT /api/trips/:id, DELETE /trips/:id, POST co-organizers, DELETE co-organizers, cover-image routes)
   - Added `isOrganizer` assertions to 4 tests that verify member creation via API: creator creation, co-organizer creation, organizer-adds-co-organizer, co-organizer-adds-co-organizer
   - Updated test descriptions to include "and isOrganizer=true" where applicable

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm test` (API): ✅ PASS (605 tests across 30 test files, 0 failures)
- Reviewer: ✅ APPROVED (initial review found 4 missing integration test assertions; all fixed and re-approved)

### Learnings for future iterations

- The `getUserTrips()` method was the most complex change because it required updating a multi-stage pipeline: the DB query (adding `isOrganizer` to select), the batch processing loop, the membership map structure (from `Map<string, status>` to `Map<string, {status, isOrganizer}>`), and the summary builder. Future tasks modifying this method should trace the full data flow.
- The old model derived `isOrganizer` from `createdBy` and `status === "going"` heuristics. The new model reads it directly from the column, which is cleaner and avoids false positives (regular members with `status='going'` are no longer incorrectly flagged as organizers).
- `getCoOrganizers()` was an additional method found by researchers that also needed updating — it was not explicitly listed in the task description but used the same `status='going'` pattern for organizer detection.
- Integration tests that manually insert member records (rather than going through `createTrip()`) need explicit `isOrganizer: true` — unlike the service code which now sets it automatically, test fixtures must set it manually.
- Phase 1 (Database & Permissions Foundation) is now fully complete. All 3 tasks (1.1 schema, 1.2 permissions, 1.3 trip service) are done. Next is Phase 2: Shared Schemas & Types (Task 2.1).

## Iteration 4 — Task 2.1: Add invitation and RSVP schemas and types to shared package

**Status**: ✅ COMPLETE

### What was done

1. **New schema file** (`shared/schemas/invitation.ts`):
   - `createInvitationsSchema`: Validates `{ phoneNumbers: string[] }` with E.164 phone number regex, min 1, max 25 items
   - `updateRsvpSchema`: Validates `{ status: "going" | "not_going" | "maybe" }` — excludes `"no_response"` (server-only default)
   - Exported inferred types: `CreateInvitationsInput`, `UpdateRsvpInput`
   - Used a local copy of `phoneNumberSchema` (identical regex `/^\+[1-9]\d{1,14}$/`) to avoid circular import through `schemas/index.ts`

2. **New types file** (`shared/types/invitation.ts`):
   - `Invitation` interface: 9 fields matching DB schema (id, tripId, inviterId, inviteePhone, status, sentAt, respondedAt, createdAt, updatedAt), all timestamps as `string`
   - `MemberWithProfile` interface: 8 fields for member list display (id, userId, displayName, profilePhotoUrl, phoneNumber (optional), status, isOrganizer, createdAt)
   - 4 response types: `CreateInvitationsResponse` (with `skipped` array), `GetInvitationsResponse`, `UpdateRsvpResponse`, `GetMembersResponse`

3. **Event type updates** (`shared/types/event.ts`):
   - Added 3 optional computed fields to `Event` interface: `creatorAttending?: boolean`, `creatorName?: string`, `creatorProfilePhotoUrl?: string | null`

4. **Trip type updates** (`shared/types/trip.ts`):
   - Added 3 optional fields to `GetTripResponse` (not `TripDetail`): `isPreview?: boolean`, `userRsvpStatus?: "going" | "not_going" | "maybe" | "no_response"`, `isOrganizer?: boolean`

5. **Barrel exports updated**:
   - `shared/schemas/index.ts`: Added re-exports for `createInvitationsSchema`, `updateRsvpSchema`, `CreateInvitationsInput`, `UpdateRsvpInput`
   - `shared/types/index.ts`: Added re-exports for `Invitation`, `MemberWithProfile`, `CreateInvitationsResponse`, `GetInvitationsResponse`, `UpdateRsvpResponse`, `GetMembersResponse`
   - `shared/index.ts` intentionally NOT modified (follows existing pattern — domain-specific schemas/types like event, accommodation, member-travel are not re-exported from top-level barrel)

6. **Tests** (`shared/__tests__/invitation-schemas.test.ts`): 15 new tests
   - `createInvitationsSchema`: valid phone arrays, boundary values (1 and 25), empty array rejection, >25 rejection, invalid phone formats (missing +, too short, too long, letters, leading zero), non-array rejection, missing field, error messages
   - `updateRsvpSchema`: all 3 valid statuses, `no_response` rejection, invalid values, missing field, error messages

7. **Exports test updated** (`shared/__tests__/exports.test.ts`):
   - Added invitation schema import and `toBeDefined()` check
   - Added `CreateInvitationsInput` and `UpdateRsvpInput` type usage examples
   - Added schema validation examples for both new schemas

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- `pnpm test` (API): ✅ PASS (605 tests across 30 test files, 0 failures)
- Reviewer: ✅ APPROVED (exact architecture compliance, consistent conventions, thorough tests)

### Learnings for future iterations

- The `phoneNumberSchema` exists in 3 places with 2 different regexes: `schemas/index.ts` and `schemas/invitation.ts` use `/^\+[1-9]\d{1,14}$/` (2-15 digits after +), while `schemas/trip.ts` uses `/^\+[1-9]\d{6,13}$/` (7-14 digits after +). This is a pre-existing inconsistency. Future tasks should consider consolidating.
- Importing `phoneNumberSchema` from `./index.js` within a schema file risks circular dependency since `index.ts` re-exports from the importing file. Using a local copy avoids this cleanly.
- New fields added to `GetTripResponse` are at the response level (not entity level) because `isPreview`, `userRsvpStatus`, and `isOrganizer` are request-context metadata, not trip properties.
- New fields on `Event` are optional (`?`) because they are computed fields populated only by specific list endpoints via JOIN queries, not present on creation/single-fetch responses.
- Phase 2 (Shared Schemas & Types) is now complete (only had 1 task). Next is Phase 3: Backend API Endpoints (Task 3.1: Create InvitationService).

## Iteration 5 — Task 3.1: Create InvitationService with batch invite and RSVP logic

**Status**: ✅ COMPLETE

### What was done

1. **InvitationService** (`apps/api/src/services/invitation.service.ts`) — New file, ~510 lines:
   - `IInvitationService` interface with 6 methods and JSDoc
   - `InvitationService` class with constructor taking `db: AppDatabase`, `permissionsService: IPermissionsService`, `smsService: ISMSService`
   - `createInvitations()`: Transaction-safe batch invite. Checks `canInviteMembers` permission, counts current members against 25 limit, deduplicates against already-invited and already-member phones, creates invitation records, creates member records for phones belonging to existing users (status `no_response`), mock-sends SMS outside transaction. Returns `{ invitations, skipped }`.
   - `getInvitationsByTrip()`: LEFT JOINs invitations with users on `inviteePhone=phoneNumber` to include `inviteeName` where available.
   - `revokeInvitation()`: Validates invitation exists and user is organizer of the trip. Deletes associated member record (if user exists) and the invitation record.
   - `updateRsvp()`: Checks `canUpdateRsvp` permission, updates `members.status`, JOINs with users table to return `MemberWithProfile` with string timestamps.
   - `getTripMembers()`: Checks `isMember` permission, JOINs members with users, conditionally includes `phoneNumber` only when requesting user is an organizer.
   - `processPendingInvitations()`: Finds pending invitations by phone number, creates member records if not already existing, marks invitations as `accepted`. Idempotent.

2. **Fastify plugin** (`apps/api/src/plugins/invitation-service.ts`):
   - Follows identical pattern to `event-service.ts`
   - Dependencies: `["database", "permissions-service", "sms-service"]`
   - Decorates `invitationService` on Fastify instance

3. **Error type** (`apps/api/src/errors.ts`):
   - Added `InvitationNotFoundError` (404, code `INVITATION_NOT_FOUND`)

4. **Type augmentation** (`apps/api/src/types/index.ts`):
   - Added `IInvitationService` import and `invitationService: IInvitationService` to `FastifyInstance` interface

5. **App registration** (`apps/api/src/app.ts`):
   - Added `invitationServicePlugin` import and registration after `uploadServicePlugin`

6. **Unit tests** (`apps/api/tests/unit/invitation.service.test.ts`) — 26 tests across 6 describe blocks:
   - **createInvitations** (8 tests): new phones, skip already-invited, skip already-members, mixed scenarios, 25-member limit enforcement, permission denied, trip not found, invitation-only for non-existent users
   - **getInvitationsByTrip** (2 tests): returns invitations, includes invitee names
   - **revokeInvitation** (3 tests): revokes and removes member, not found error, permission denied
   - **updateRsvp** (5 tests): going/maybe/not_going statuses, correct MemberWithProfile fields, permission denied
   - **getTripMembers** (4 tests): returns profiles, includes phone for organizers, excludes phone for non-organizers, permission denied
   - **processPendingInvitations** (4 tests): creates member records, updates status to accepted, no duplicate members, handles no pending gracefully

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test` (API): ✅ PASS (631 tests across 31 test files, 0 failures — up from 605)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- Reviewer: ✅ APPROVED (4 low-severity non-blocking observations, all consistent with codebase patterns)

### Reviewer observations (all non-blocking)

- `revokeInvitation` and `processPendingInvitations` could use transactions for full atomicity, but both are idempotent and consistent with existing patterns
- `getInvitationsByTrip` does not check permissions at service level — access control will be enforced at route/controller level in Task 3.2
- `MemberLimitExceededError` uses HTTP 409 (pre-existing definition) vs architecture spec's 400 — pre-existing, not introduced in this change
- SMS notification reuses `sendVerificationCode` with `"invite"` code — works for mock, may need dedicated method for real SMS later

### Learnings for future iterations

- The `count()` function from `drizzle-orm` returns `{ value: number }` when used as `select({ value: count() })`. This is the standard pattern for counting rows.
- `exactOptionalPropertyTypes` in strict TypeScript means you cannot assign `undefined` to optional fields explicitly — you must conditionally add the property using spread: `...(condition ? { field: value } : {})`.
- The InvitationService needs 3 constructor dependencies (db, permissionsService, smsService) unlike most services that need 2. The plugin must declare `"sms-service"` in its dependency array.
- For batch invite deduplication, it's important to check both the invitations table (already invited) AND the members table (already a member) to build the skipped list correctly.
- The member limit check counts current members + new phones to invite (after filtering skipped), not total invitations. Phones without user accounts don't get member records until they register.
- `DBInvitation` (renamed import from schema) has `Date` objects for timestamps, while the shared `Invitation` type has `string` timestamps. The controller/route layer (Task 3.2) will need to convert dates to ISO strings.
- Phase 3 Task 3.1 is complete. Next is Task 3.2: Create invitation and RSVP route endpoints.

## Iteration 6 — Task 3.2: Create invitation and RSVP route endpoints

**Status**: ✅ COMPLETE

### What was done

1. **Invitation controller** (`apps/api/src/controllers/invitation.controller.ts`) — New file, 5 handler methods:
   - `createInvitations`: POST handler that delegates to `invitationService.createInvitations()`, returns 201 with `{ success: true, invitations, skipped }`
   - `getInvitations`: GET handler with explicit organizer permission check via `permissionsService.canInviteMembers()` before calling `getInvitationsByTrip()`, returns 200
   - `revokeInvitation`: DELETE handler that delegates to `invitationService.revokeInvitation()`, returns 200 with `{ success: true }`
   - `updateRsvp`: POST handler that delegates to `invitationService.updateRsvp()`, returns 200 with `{ success: true, member }`
   - `getMembers`: GET handler that delegates to `invitationService.getTripMembers()` (which handles its own permission check), returns 200 with `{ success: true, members }`
   - All methods follow the established try/catch pattern: re-throw typed errors, log and return 500 for unexpected errors

2. **Invitation routes** (`apps/api/src/routes/invitation.routes.ts`) — New file:
   - GET routes (`/trips/:tripId/invitations`, `/trips/:tripId/members`) with `preHandler: authenticate` only
   - Write routes in scoped register block with `authenticate + requireCompleteProfile`:
     - `POST /trips/:tripId/invitations` with `createInvitationsSchema` body validation
     - `DELETE /invitations/:id` with UUID param validation
     - `POST /trips/:tripId/rsvp` with `updateRsvpSchema` body validation
   - Zod param schemas for `tripId` and invitation `id` UUIDs

3. **Route registration** (`apps/api/src/app.ts`):
   - Added `invitationRoutes` import and registered with `{ prefix: "/api" }`

4. **Integration tests** (`apps/api/tests/integration/invitation.routes.test.ts`) — 23 test cases across 5 endpoint groups:
   - **POST /api/trips/:tripId/invitations** (5 tests): create invitations (201), skip already-invited, 403 non-organizer, 401 unauthenticated, 400 invalid phones
   - **GET /api/trips/:tripId/invitations** (3 tests): 200 for organizer, 403 for non-organizer, 401 unauthenticated
   - **DELETE /api/invitations/:id** (4 tests): 200 revoke, 404 non-existent, 403 non-organizer, 401 unauthenticated
   - **POST /api/trips/:tripId/rsvp** (6 tests): going, maybe, not_going (all 3 enum values), 403 non-member, 400 invalid status, 401 unauthenticated
   - **GET /api/trips/:tripId/members** (5 tests): 200 member list, phone visible for organizer, phone hidden for non-organizer, 403 non-member, 401 unauthenticated

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages)
- `pnpm lint`: ✅ PASS (all 3 packages)
- `pnpm test` (API): ✅ PASS (654 tests across 32 test files, 0 failures — up from 631)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- Reviewer: ✅ APPROVED (initial review flagged 5 missing 401 tests and missing `not_going` RSVP test; all fixed and re-approved)

### Reviewer observations (all resolved)

- DELETE route uses `/api/invitations/:id` instead of architecture spec's `/api/trips/:tripId/invitations/:invitationId` — accepted as consistent with existing codebase pattern (events, accommodations use the same non-nested DELETE pattern)
- Missing 401 tests for 4 of 5 endpoints — all added
- Missing `not_going` RSVP test — added for complete enum coverage

### Learnings for future iterations

- The `getInvitationsByTrip` service method does NOT check permissions internally (unlike `getTripMembers` which does). The controller must explicitly check organizer permission via `permissionsService.canInviteMembers()` before calling it. This pattern inconsistency should be noted for any future service methods.
- Fastify's JSON serializer automatically converts Date objects to ISO strings via `.toJSON()`, so no manual date conversion was needed in the controller despite the DB returning `Date` objects and the shared types expecting `string` timestamps.
- The DELETE route follows the existing codebase pattern (`/api/invitations/:id` not nested under trips) which differs from the architecture spec. The service looks up the invitation to find the tripId internally, making the tripId param unnecessary in the URL.
- 401 tests are important for every endpoint — the first review caught 4 missing ones. Always include 401 (unauthenticated) tests alongside 403 (unauthorized) tests.
- All three RSVP enum values (`going`, `maybe`, `not_going`) should be tested explicitly for complete coverage.
- Phase 3 Task 3.2 is complete. Next is Task 3.3: Modify trip and event endpoints for preview and creatorAttending.

## Iteration 7 — Task 3.3: Modify trip and event endpoints for preview and creatorAttending

**Status**: ✅ COMPLETE

### What was done

1. **TripService `getTripById()` changes** (`apps/api/src/services/trip.service.ts`):
   - Updated return type to include `isPreview`, `userRsvpStatus`, and `isOrganizer` fields
   - Added preview field filtering: when `isPreview` is true, trip object only includes `id`, `name`, `destination`, `startDate`, `endDate`, `preferredTimezone`, `description`, `coverImageUrl` (8 allowed fields). Other fields like `createdBy`, `allowMembersToAddEvents`, `cancelled` are stripped from preview.
   - Preview logic: `isPreview = status !== 'going' && !isOrganizer`. Organizers always get full data regardless of RSVP status.
   - Defined proper named types: `OrganizerInfo`, `TripMembershipMeta`, `TripPreview` (using `Pick<Trip, ...>`), `TripDetailResult`
   - Updated `ITripService` interface accordingly

2. **Trip controller changes** (`apps/api/src/controllers/trip.controller.ts`):
   - Updated `getTripById` handler to destructure `isPreview`, `userRsvpStatus`, `isOrganizer` from service result
   - Response now sends `{ success: true, trip, isPreview, userRsvpStatus, isOrganizer }`

3. **EventService `getEventsByTrip()` changes** (`apps/api/src/services/event.service.ts`):
   - Added LEFT JOIN with `users` table (on `events.createdBy = users.id`) for displayName and profilePhotoUrl
   - Added LEFT JOIN with `members` table (on `members.userId = events.createdBy AND members.tripId = events.tripId`) for RSVP status
   - Computes `creatorAttending = members.status === 'going'` (false when member record is null, i.e., creator removed from trip)
   - Maps results to include `creatorAttending`, `creatorName`, `creatorProfilePhotoUrl` on each event
   - Added explanatory comment for why LEFT JOIN is used on members (creator may have been removed)
   - Updated `IEventService` interface return type

4. **Event controller access gating** (`apps/api/src/controllers/event.controller.ts`):
   - Added preview access check in both `listEvents` and `getEvent` endpoints
   - Non-going, non-organizer members get 403 with `PREVIEW_ACCESS_ONLY` error code
   - Uses existing `permissionsService.canViewFullTrip()` and `permissionsService.isOrganizer()` methods

5. **Auth flow integration** (`apps/api/src/controllers/auth.controller.ts`):
   - Added `processPendingInvitations()` call after `getOrCreateUser()` in `verifyCode` handler
   - Wrapped in try/catch so invitation processing failures don't block login
   - Comment clarifies "fault-tolerant: awaited but wrapped in try/catch so failures don't break auth"

6. **Integration tests** — 12 new tests across 3 files:
   - **Trip preview tests** (`apps/api/tests/integration/trip.routes.test.ts`) — 7 tests:
     - Returns 404 for uninvited user
     - Returns preview for `no_response` member (isPreview: true, restricted fields absent, allowed fields present)
     - Returns preview for `maybe` member (same assertions)
     - Returns preview for `not_going` member (same assertions)
     - Returns full data for Going member (isPreview: false)
     - Returns full data for organizer regardless of RSVP status
     - Includes userRsvpStatus and isOrganizer in response
   - **Event creator tests** (`apps/api/tests/integration/event.routes.test.ts`) — 4 tests:
     - Events include creatorAttending: true when creator status is 'going'
     - creatorAttending is false when creator RSVP is 'maybe'
     - Events include creatorName and creatorProfilePhotoUrl
     - Returns 403 for non-going non-organizer member
     - Returns creatorAttending false when event creator removed from trip
   - **Auth integration test** (`apps/api/tests/integration/auth.verify-code.test.ts`) — 1 test:
     - Processes pending invitations after verify-code (member record created, invitation status updated to 'accepted')

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm lint`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm test` (API): ✅ PASS (667 tests across 32 test files, 0 failures — up from 654)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- Reviewer: ✅ APPROVED (initial review returned NEEDS_WORK with 6 issues; all fixed and re-approved)

### Reviewer feedback (all resolved)

Initial review found 6 issues:
1. **[HIGH]** Preview mode returned all trip fields instead of filtering — Fixed: preview now returns only 8 allowed fields
2. **[MEDIUM]** Preview tests didn't assert restricted fields absent — Fixed: added negative assertions for `createdBy`, `allowMembersToAddEvents`, `cancelled`, `createdAt`, `updatedAt`
3. **[MEDIUM]** Missing test for `not_going` status — Fixed: added dedicated test case
4. **[MEDIUM]** Events endpoint not gated behind preview check — Fixed: added `canViewFullTrip` + `isOrganizer` check returning 403
5. **[LOW]** Missing comment for null member record edge case — Fixed: added comment and regression test
6. **[LOW]** Type assertion instead of named types — Fixed: defined `OrganizerInfo`, `TripMembershipMeta`, `TripPreview`, `TripDetailResult` types

### Learnings for future iterations

- Preview mode should use an allowlist approach (explicit `Pick<Trip, ...>` with only allowed fields) rather than spreading the full object. This is safe-by-construction — new columns added to the trips table won't leak into preview responses.
- When the architecture spec says "no itinerary data reference" for preview, this means the events/itinerary endpoints themselves should return 403 for non-going members, not just omit data from the trip response. The frontend should check `isPreview` before requesting events.
- LEFT JOIN on members table is needed when querying creator info because the creator may have been removed from the trip. Using INNER JOIN would silently drop events whose creators were removed.
- The `canViewFullTrip()` method was already defined in PermissionsService (Task 1.2) but unused until this task. It was the correct abstraction to reuse for both trip preview checks and event access gating.
- Auth integration with `processPendingInvitations` should be fault-tolerant (try/catch) not fire-and-forget (void promise). Using `await` ensures the operation completes before the response is sent, but the try/catch prevents login failures if invitation processing errors occur.
- Named types (`OrganizerInfo`, `TripPreview`, etc.) at the service level improve readability and help TypeScript catch mismatches between the interface declaration and implementation. They're better than inline `as` assertions.
- Phase 3 (Backend API Endpoints) is now fully complete. All 3 tasks (3.1 InvitationService, 3.2 invitation routes, 3.3 preview + creatorAttending) are done. Next is Phase 4: Frontend — Invitation & RSVP UI (Task 4.1).

## Iteration 8 — Task 4.1: Add frontend hooks and update types for invitations, RSVP, and members

**Status**: ✅ COMPLETE

### What was done

1. **New query file** (`apps/web/src/hooks/invitation-queries.ts`):
   - `invitationKeys` query key factory: `all`, `lists()`, `list(tripId)`, `create()`, `revoke()`
   - `memberKeys` query key factory: `all`, `lists()`, `list(tripId)`
   - `rsvpKeys` query key factory: `update()`
   - `invitationsQueryOptions(tripId)` — fetches `GET /trips/:tripId/invitations`, returns `Invitation[]`
   - `membersQueryOptions(tripId)` — fetches `GET /trips/:tripId/members`, returns `MemberWithProfile[]`
   - Server-safe (no `"use client"` directive), follows exact `event-queries.ts` pattern

2. **New hooks file** (`apps/web/src/hooks/use-invitations.ts`):
   - `useInvitations(tripId)` — query wrapper for invitations list (organizer-only)
   - `useMembers(tripId)` — query wrapper for members list
   - `useInviteMembers(tripId)` — mutation for `POST /trips/:tripId/invitations`, invalidates invitation + member queries on settled
   - `useRevokeInvitation(tripId)` — mutation for `DELETE /invitations/:id`, invalidates invitation + member queries on settled
   - `useUpdateRsvp(tripId)` — mutation for `POST /trips/:tripId/rsvp`, invalidates trip detail + trips list + member queries on settled
   - `getInviteMembersErrorMessage()` — handles PERMISSION_DENIED, MEMBER_LIMIT_EXCEEDED, VALIDATION_ERROR, UNAUTHORIZED, network errors
   - `getRevokeInvitationErrorMessage()` — handles PERMISSION_DENIED, INVITATION_NOT_FOUND, UNAUTHORIZED, network errors
   - `getUpdateRsvpErrorMessage()` — handles PERMISSION_DENIED, NOT_FOUND, VALIDATION_ERROR, UNAUTHORIZED, network errors
   - Re-exports all keys, options, and types from `invitation-queries.ts` for backward compatibility
   - `"use client"` directive, follows exact `use-events.ts` pattern

3. **Trip queries update** (`apps/web/src/hooks/trip-queries.ts`):
   - Added `TripDetailWithMeta` interface extending `TripDetail` with `isPreview: boolean`, `userRsvpStatus`, `isOrganizer: boolean`
   - Updated `tripDetailQueryOptions` to merge envelope fields from `GetTripResponse` into the returned object using `??` defaults: `isPreview: false`, `userRsvpStatus: "going"`, `isOrganizer: false`

4. **Trip hooks update** (`apps/web/src/hooks/use-trips.ts`):
   - Added import and re-export of `TripDetailWithMeta` type

5. **Server prefetch update** (`apps/web/src/app/(app)/trips/[id]/page.tsx`):
   - Updated `setQueryData` call to construct `TripDetailWithMeta` shape (including `isPreview`, `userRsvpStatus`, `isOrganizer`) to match the client-side `tripDetailQueryOptions` return type, ensuring hydration consistency

6. **Trip detail content update** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`):
   - Replaced manual `isOrganizer` computation (matching user.id against trip.createdBy and trip.organizers) with `trip.isOrganizer` from API response
   - Replaced hardcoded "Going" badge with dynamic RSVP status badge:
     - `going` → green "Going" badge (bg-success/15)
     - `maybe` → amber "Maybe" badge (bg-amber-500/15)
     - `not_going` → red "Not Going" badge (bg-destructive/15)
     - `no_response` → gray "No Response" badge (bg-muted)
   - Added conditional rendering: `{!trip.isPreview && <ItineraryView tripId={tripId} />}` to hide itinerary in preview mode
   - Removed unused `useAuth` import (user variable was only needed for old manual isOrganizer computation)

7. **New tests** (`apps/web/src/hooks/__tests__/use-invitations.test.tsx`) — 36 tests:
   - `useInvitations`: successful fetch (2 tests), API error handling (1 test)
   - `useMembers`: successful fetch (2 tests), API error handling (1 test)
   - `useInviteMembers`: successful batch invite (1 test), cache invalidation (1 test), error handling (1 test)
   - `useRevokeInvitation`: successful revocation (1 test), cache invalidation (1 test), error handling (1 test)
   - `useUpdateRsvp`: successful update (1 test), cache invalidation (1 test), error handling (1 test)
   - Error message helpers: 21 tests covering all code paths for all 3 helpers

8. **Updated tests**:
   - `apps/web/src/hooks/__tests__/use-trips.test.tsx`: Updated all `useTripDetail` assertions to expect `TripDetailWithMeta` shape (with `isPreview: false`, `userRsvpStatus: "going"`, `isOrganizer: false` defaults). Added 2 new tests for meta field defaults and explicit values from API response.
   - `apps/web/src/app/(app)/trips/[id]/page.test.tsx`: Updated `setQueryData` assertion to include meta fields
   - `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`: Updated mock data type from `TripDetail` to `TripDetailWithMeta`, added meta fields to mock, updated authorization tests

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm lint`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- `pnpm test` (API): ✅ PASS (667 tests across 32 test files, 0 failures)
- `pnpm test` (web): ✅ PASS (653 of 670 tests passed — 17 pre-existing date/time picker failures unrelated to this task)
- New `use-invitations.test.tsx`: ✅ PASS (36/36 tests)
- Updated `use-trips.test.tsx`: ✅ PASS (36/36 tests)
- Reviewer: ✅ APPROVED (2 low-severity non-blocking observations)

### Reviewer observations (all non-blocking)

- **[LOW]** Query key structure uses `["invitations", "list", tripId]` instead of architecture spec's `["trips", tripId, "invitations"]` — this follows the established codebase convention (same as `eventKeys`, `tripKeys`). The architecture spec should be updated, not the code.
- **[LOW]** Default `userRsvpStatus: "going"` when API omits the field — reasonable for backward compatibility with pre-Phase 5 responses. The API now always returns this field, so this is purely defensive.

### Learnings for future iterations

- The two-file hook pattern (`*-queries.ts` + `use-*.ts`) is fundamental to the codebase. The queries file is server-safe (no `"use client"`) for SSR prefetching, while the hooks file is client-only.
- `TripDetailWithMeta` extends `TripDetail` with envelope-level metadata (`isPreview`, `userRsvpStatus`, `isOrganizer`). The server-side `page.tsx` must construct the same shape when setting query data for hydration consistency.
- When `tripDetailQueryOptions` changes its return type, ALL consumers need updating: the server prefetch (`page.tsx`), the component that reads the data (`trip-detail-content.tsx`), and the tests for both.
- `useUpdateRsvp` must invalidate three query families: trip detail (isPreview/userRsvpStatus changes), trips list (rsvpStatus in TripSummary changes), and members list (member status changes). Missing any of these would cause stale UI.
- Removing the manual `isOrganizer` computation from `trip-detail-content.tsx` also made the `useAuth` import unnecessary, since the `user` variable was only used for that computation.
- The `useInviteMembers` mutation returns the full `CreateInvitationsResponse` (with `invitations` and `skipped` arrays) instead of unwrapping it, so the UI component (Task 4.3) can display both success and skipped information.
- Phase 4 Task 4.1 is complete. Next is Task 4.2: Build TripPreview component and conditional rendering on trip detail page.

## Iteration 9 — Task 4.2: Build TripPreview component and conditional rendering on trip detail page

**Status**: ✅ COMPLETE

### What was done

1. **New TripPreview component** (`apps/web/src/components/trip/trip-preview.tsx`):
   - `"use client"` component accepting `trip: TripDetailWithMeta` and `tripId: string` props
   - Cover image section (or gradient placeholder) using the same hero pattern as trip-detail-content.tsx
   - Trip name (Playfair font), destination (MapPin icon), date range (Calendar icon), member count (Users icon)
   - Conditional description rendering in a card
   - Organizer avatars (photos or initials via `getInitials`) and names
   - Invitation banner with Mail icon: "You've been invited!" / "RSVP to see the full itinerary."
   - Three RSVP action buttons with status-aware styling:
     - **Going**: `bg-success` when active, success-colored outline otherwise
     - **Maybe**: `bg-amber-500` when active, amber-colored outline otherwise
     - **Not Going**: `bg-destructive/15` when active, destructive ghost otherwise
   - Uses `useUpdateRsvp(tripId)` from `@/hooks/use-invitations` for mutation
   - Toast success on RSVP change, toast error via `getUpdateRsvpErrorMessage` on failure
   - All buttons disabled during `isPending` with `Loader2` spinner on active status button
   - After RSVPing "Going", cache invalidation causes refetch with `isPreview: false`, auto-switching to full view

2. **Modified trip-detail-content.tsx** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`):
   - Added `import { TripPreview } from "@/components/trip/trip-preview"`
   - Added early return `if (trip.isPreview) { return <TripPreview trip={trip} tripId={tripId} />; }` before the full detail render
   - Removed the now-redundant `{!trip.isPreview && ...}` guard on `<ItineraryView>` since preview mode returns early

3. **Updated barrel exports** (`apps/web/src/components/trip/index.ts`):
   - Added `export { TripPreview } from "./trip-preview";`

4. **New TripPreview tests** (`apps/web/src/components/trip/__tests__/trip-preview.test.tsx`) — 17 tests:
   - Renders trip name, destination, and date range
   - Renders cover image when coverImageUrl exists
   - Renders gradient placeholder when no cover image
   - Renders organizer names and avatars (including initials fallback)
   - Renders member count
   - Shows invitation banner message
   - Renders all 3 RSVP buttons
   - Highlights Going/Maybe/Not Going button as active when matching userRsvpStatus (3 tests)
   - Calls useUpdateRsvp with correct tripId
   - Clicking Going/Maybe/Not Going calls mutate with correct status (3 tests)
   - Shows loading state (all buttons disabled) when isPending
   - Renders description when available
   - Does NOT render description when not provided

5. **Updated trip-detail-content tests** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`) — 3 new tests:
   - Added TripPreview mock component
   - "renders TripPreview component when trip.isPreview is true"
   - "does not render ItineraryView when trip.isPreview is true"
   - "does not render TripPreview when trip.isPreview is false (renders ItineraryView instead)"

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm lint`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm test` (web): ✅ PASS (673 of 690 tests passed — 17 pre-existing date/time picker failures unrelated to this task)
- `pnpm test` (API): ✅ PASS (667 tests across 32 test files, 0 failures)
- New `trip-preview.test.tsx`: ✅ PASS (17/17 tests)
- Updated `trip-detail-content.test.tsx`: ✅ PASS (39/39 tests)
- Reviewer: ✅ APPROVED (3 low-severity non-blocking observations)

### Reviewer observations (all non-blocking)

- **[LOW]** Going button spinner logic uses unnecessarily convoluted nested ternary — functionally correct but could be simplified to match Maybe/Not Going buttons' pattern
- **[LOW]** Spinner appears on the currently-active status button rather than the clicked button — minor UX imperfection since `isPending` is global mutation state and `userRsvpStatus` hasn't updated yet. All buttons are disabled during pending so users still see activity indication.
- **[LOW]** `useEvents(tripId)` fires unconditionally even in preview mode — data is unused since TripPreview renders via early return. Minimal performance cost since server returns 403 for non-Going members anyway.

### Learnings for future iterations

- The early-return pattern (`if (trip.isPreview) return <TripPreview .../>`) is cleaner than wrapping both preview and full detail in conditional blocks. It also allowed removing the redundant `!trip.isPreview` guard on `<ItineraryView>`.
- When building status-aware button styles, track which button was clicked via local state if you want the spinner on the clicked button rather than the current-status button. The global `isPending` + server-side `userRsvpStatus` approach shows spinner on the "wrong" button, though this is cosmetically minor.
- The `useEvents(tripId)` hook fires unconditionally in preview mode because it's called before the early return check. To avoid this, the hook could accept an `enabled` option, or the query could be conditionally called. Not worth fixing now since the server rejects the request anyway.
- TripPreview only accesses fields from the server's preview allowlist (`name`, `destination`, `startDate`, `endDate`, `description`, `coverImageUrl`, `organizers`, `memberCount`, `userRsvpStatus`), so no sensitive data leaks in preview mode.
- Phase 4 Task 4.2 is complete. Next is Task 4.3: Build InviteMembersDialog with batch phone input.

## Iteration 10 — Task 4.3: Build InviteMembersDialog with batch phone input

**Status**: ✅ COMPLETE

### What was done

1. **New InviteMembersDialog component** (`apps/web/src/components/trip/invite-members-dialog.tsx`):
   - `"use client"` component with props: `{ open: boolean; onOpenChange: (open: boolean) => void; tripId: string; }`
   - Uses `useForm` from `react-hook-form` with `zodResolver` and `createInvitationsSchema` from `@tripful/shared/schemas`
   - Phone number input using existing `PhoneInput` component from `@/components/ui/phone-input`
   - Local state (`currentPhone`, `phoneError`) manages the phone input separately from the form's `phoneNumbers` array
   - "Add" button validates phone (E.164 regex `/^\+[1-9]\d{1,14}$/`), detects duplicates, and appends to form's `phoneNumbers` array
   - Enter key on phone input wrapper div triggers "Add" (prevents default form submission)
   - Added phone numbers displayed as `Badge` chips with `variant="secondary"` and removable X buttons with `aria-label`
   - `formatPhoneNumber` from `@/lib/format` formats E.164 to readable format for chip display
   - Submit sends batch invite via `useInviteMembers(tripId)` mutation
   - Success toast shows invited count with skipped count when applicable (e.g., "3 invitations sent (1 already invited)")
   - Error toast via `getInviteMembersErrorMessage` for API errors
   - Form resets via `useEffect` watching `open` prop
   - Loading state: all inputs disabled during `isPending`, `Loader2` spinner on submit button
   - Styling matches codebase: `sm:max-w-2xl` dialog, Playfair font title, `h-12 rounded-xl` inputs/buttons, `variant="gradient"` submit

2. **Barrel export** (`apps/web/src/components/trip/index.ts`):
   - Added `export { InviteMembersDialog } from "./invite-members-dialog";`

3. **Trip detail page integration** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`):
   - Added `dynamic()` import for InviteMembersDialog with `{ ssr: false }` and `preloadInviteMembersDialog` on hover/focus
   - Added `isInviteOpen` state
   - Added "Invite" button with `UserPlus` icon next to "Edit trip" button in organizer-only area
   - Added `InviteMembersDialog` render in organizer-only conditional block

4. **New tests** (`apps/web/src/components/trip/__tests__/invite-members-dialog.test.tsx`) — 22 tests:
   - **Dialog open/close** (3 tests): renders when open, hidden when closed, cancel calls onOpenChange(false)
   - **Form fields** (3 tests): phone input, add button, submit button (disabled when no phones)
   - **Phone management** (5 tests): add valid phone as chip, reject invalid phone, reject duplicate, remove chip, show count
   - **Submission** (3 tests): API called with correct phoneNumbers array, success toast with count, success toast with skipped count
   - **Error handling** (2 tests): generic API error toast, permission denied error message
   - **Loading state** (2 tests): disabled inputs during submission, spinner on submit button
   - **Styling** (3 tests): Playfair font on title, gradient variant on submit, secondary variant on Badge chips
   - **Form reset** (1 test): phones cleared when dialog closes and reopens

5. **Updated tests** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`):
   - Added mock for `@/components/trip/invite-members-dialog`
   - 2 new tests: "renders Invite button for organizer" and "does not render Invite button for non-organizer"

### Verification results

- `pnpm typecheck`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm lint`: ✅ PASS (all 3 packages, 0 errors)
- `pnpm test` (web): ✅ PASS (697 of 714 tests passed — 17 pre-existing date/time picker failures unrelated to this task)
- `pnpm test` (API): ✅ PASS (667 tests across 32 test files, 0 failures)
- `pnpm test` (shared): ✅ PASS (185 tests across 9 test files, 0 failures)
- New `invite-members-dialog.test.tsx`: ✅ PASS (22/22 tests)
- Updated `trip-detail-content.test.tsx`: ✅ PASS (41/41 tests)
- Reviewer: ✅ APPROVED (4 low-severity non-blocking suggestions)

### Reviewer observations (all non-blocking)

- **[LOW]** `PHONE_REGEX` constant duplicates the regex from shared schema — reasonable pragmatic choice to avoid importing Zod internals, but should be noted if the regex changes in the shared package
- **[LOW]** `onKeyDown` handler for Enter-to-add is on wrapping `div` — works correctly since keydown bubbles, but worth noting if form structure evolves
- **[LOW]** No test for Enter key shortcut to add phone — cosmetic gap, all other phone management paths tested
- **[LOW]** `form` in `useEffect` dependency array is stable — technically unnecessary but harmless and ESLint-compliant

### Learnings for future iterations

- The `PhoneInput` component's `PhoneInputProps` type does not include `onKeyDown` or `aria-label`. To handle Enter key for "Add", the approach is to wrap the PhoneInput in a `div` with `onKeyDown` and let the keydown event bubble up. This is type-safe and avoids extending the third-party component's props.
- The `formatPhoneNumber` utility from `@/lib/format` uses `react-phone-number-input`'s `parsePhoneNumber` to convert E.164 (`+14155552671`) to international format (`+1 415 555 2671`), making phone chips more readable.
- The `useInviteMembers` mutation returns `CreateInvitationsResponse` with both `invitations[]` and `skipped[]` arrays. The success handler should construct a message showing both counts for transparency.
- The controlled dialog pattern (`open`/`onOpenChange`) with `useEffect` form reset is consistent across all dialogs in this codebase. The `form.reset()` in the effect ensures no stale phone numbers appear when reopening the dialog.
- The `dynamic()` import with `preload` pattern for dialogs is critical for code splitting — dialogs are only loaded when the user hovers/focuses the trigger button, not on initial page load. This keeps the trip detail page bundle small.
- Phase 4 Task 4.3 is complete. Next is Task 4.4: Build MembersList component as tab on trip detail page.

