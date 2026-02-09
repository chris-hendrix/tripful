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

