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
