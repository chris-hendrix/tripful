# Ralph Progress

Tracking implementation progress for Phase 5.5: User Profile & Auth Redirects.

## Iteration 1 — Task 1.1: Update DB schema, shared types, and Zod schemas ✅

**Status**: COMPLETED

### Changes Made

**DB Schema** (`apps/api/src/db/schema/index.ts`):
- Added `jsonb` to drizzle-orm/pg-core imports
- Changed `timezone` column from `.notNull().default("UTC")` to nullable (no constraint)
- Added `handles: jsonb("handles").$type<Record<string, string>>()` column to users table

**Migration** (`apps/api/src/db/migrations/0006_fresh_rogue.sql`):
- Generated and applied: drops NOT NULL + default on timezone, adds handles JSONB column

**Shared Types**:
- `shared/types/user.ts`: `timezone: string | null`, added `handles: Record<string, string> | null`
- `shared/types/invitation.ts`: Added `handles: Record<string, string> | null` to `MemberWithProfile`

**Shared Schemas**:
- `shared/schemas/auth.ts`: `userResponseSchema` timezone → `.nullable()`, added `handles` field; `completeProfileSchema` timezone → `.nullable().optional()`
- `shared/schemas/invitation.ts`: Added `handles` to `memberWithProfileSchema`
- `shared/schemas/user.ts` (NEW): `ALLOWED_HANDLE_PLATFORMS`, `userHandlesSchema`, `updateProfileSchema`, `HandlePlatform`, `UpdateProfileInput`
- `shared/schemas/index.ts`: Added barrel exports for new user profile schemas

**Auth Service** (`apps/api/src/services/auth.service.ts`):
- `updateProfile` signature expanded to accept `timezone: string | null`, `profilePhotoUrl: string | null`, `handles: Record<string, string> | null`
- `getOrCreateUser` no longer sets `timezone: "UTC"` (new users get null)

**Invitation Service** (`apps/api/src/services/invitation.service.ts`):
- Added `handles` to query selects in `updateRsvp` and `getTripMembers`

**Trip Service** (`apps/api/src/services/trip.service.ts`):
- Updated `OrganizerInfo` type to allow `timezone: string | null`

**Tests Updated**:
- `apps/api/tests/unit/auth.service.test.ts`: timezone expectations → null
- `apps/api/tests/unit/schema.test.ts`: nullable timezone assertions
- `apps/api/tests/integration/auth.verify-code.test.ts`: timezone → null
- `apps/web/src/hooks/__tests__/use-invitations.test.tsx`: `handles: null` in mocks
- `apps/web/src/components/trip/__tests__/members-list.test.tsx`: `handles: null` in mocks
- `shared/__tests__/exports.test.ts`: `handles: null` in User type mock

### Verification
- **typecheck**: PASS (all 3 packages, zero errors)
- **lint**: PASS (all 3 packages)
- **tests**: PASS (shared: 185/185, api: 95/95, web: 762/767 — 5 pre-existing failures confirmed unrelated)
- **reviewer**: APPROVED

### Learnings
- Drizzle ORM columns are nullable by default when `.notNull()` is omitted — no explicit `.nullable()` needed
- The shared package uses raw `.ts` files as exports (no compilation step for dev)
- Convention: `.nullable().optional()` ordering in Zod schemas, never `.optional().nullable()`
- 5 pre-existing web test failures exist: trip-preview (2), create-member-travel-dialog (2), itinerary-header (1) — all unrelated to this phase
- When changing types in shared/, must update mock objects in ALL consuming test files across api and web packages
