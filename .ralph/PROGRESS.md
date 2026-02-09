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

