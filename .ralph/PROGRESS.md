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

## Iteration 2 — Task 2.1: Create user routes, controller, and extend auth service for profile management ✅

**Status**: COMPLETED

### Changes Made

**New Files**:

`apps/api/src/controllers/user.controller.ts` (NEW):
- Object-based controller with 3 methods: `updateProfile`, `uploadProfilePhoto`, `removeProfilePhoto`
- `updateProfile`: Validates with `updateProfileSchema`, calls `authService.updateProfile()`, regenerates JWT cookie only when `displayName` changes
- `uploadProfilePhoto`: Follows trip `uploadCoverImage` multipart pattern — `request.file()` → `toBuffer()` → delete old photo → `uploadService.uploadImage()` → update user
- `removeProfilePhoto`: Idempotent delete — gets current user, deletes file if exists, sets `profilePhotoUrl: null`

`apps/api/src/routes/user.routes.ts` (NEW):
- Registers `PUT /me`, `POST /me/photo`, `DELETE /me/photo` under `/api/users` prefix
- All routes in scoped plugin with `authenticate` and `writeRateLimitConfig` hooks
- Zod body schema validation on PUT, response schemas on all endpoints
- No `requireCompleteProfile` (intentional — users need to update their own profile even if incomplete)

`apps/api/tests/integration/user.routes.test.ts` (NEW):
- 19 integration tests covering all three endpoints
- PUT /me: update displayName, timezone, timezone→null, handles CRUD, validation errors, auth required, JWT refresh verification, database persistence
- POST /me/photo: upload success, replace existing (old deleted), no file error, invalid file type, auth required
- DELETE /me/photo: remove existing, idempotent when none, verify null, auth required

**Modified Files**:

`apps/api/src/app.ts`:
- Added import of `userRoutes` from `./routes/user.routes.js`
- Registered at `prefix: "/api/users"`

### No Changes Needed (Already Done in Task 1.1)

- `authService.updateProfile()` — already accepts `profilePhotoUrl` and `handles` parameters
- `invitationService.getTripMembers()` — already selects and returns `handles` from users table

### Verification
- **typecheck**: PASS (all 3 packages, zero errors)
- **lint**: PASS (all 3 packages)
- **tests**: PASS (shared: 185/185, api: all passed including 19 new, web: 762/767 — 5 pre-existing failures)
- **manual endpoint checks**: All 3 endpoints verified (PUT /me, POST /me/photo, DELETE /me/photo) — correct responses, 401 without auth
- **reviewer**: APPROVED

### Learnings
- `authService.updateProfile()` and `invitationService.getTripMembers()` were already extended in Task 1.1 — no modifications needed
- Controllers are plain objects (not classes) following the `tripController` pattern
- For multipart upload routes, do NOT include `body` in the route schema — only `response`
- JWT token regeneration should only happen when `displayName` changes (it's in the JWT `name` claim)
- The `requireCompleteProfile` middleware is intentionally omitted from user profile routes — users need these to complete their profile
- One flaky API test (`trip.service.test.ts` phone number collision) is a pre-existing test isolation issue, not related to changes

## Iteration 3 — Task 3.1: Move dashboard files to /trips and update all references across codebase ✅

**Status**: COMPLETED

### Changes Made

**Dashboard directory deleted** (`apps/web/src/app/(app)/dashboard/`):
- Removed all 5 files: `page.tsx`, `dashboard-content.tsx`, `dashboard-content.test.tsx`, `page.test.tsx`, `loading.tsx`
- Replacement files already existed as untracked files in the `trips/` directory

**New files now canonical** (previously untracked, now the active route files):
- `apps/web/src/app/(app)/trips/page.tsx` — `TripsPage` with metadata `{ title: "My Trips" }`
- `apps/web/src/app/(app)/trips/trips-content.tsx` — `TripsContent` component
- `apps/web/src/app/(app)/trips/trips-content.test.tsx` — tests for `TripsContent`
- `apps/web/src/app/(app)/trips/page.test.tsx` — RSC tests for `TripsPage`
- `apps/web/src/app/(app)/trips/loading.tsx` — `TripsLoading` skeleton

**E2E page object replaced**:
- Deleted `apps/web/tests/e2e/helpers/pages/dashboard.page.ts`
- New `apps/web/tests/e2e/helpers/pages/trips.page.ts` (already existed) with `TripsPage` class
- Updated barrel export in `pages/index.ts`: `DashboardPage` → `TripsPage`

**Source files updated** (7 files, `/dashboard` → `/trips`):
- `apps/web/src/components/app-header.tsx` — wordmark href, nav link href, `startsWith` check, nav text "Dashboard" → "My Trips"
- `apps/web/src/app/(auth)/verify/page.tsx` — `router.push("/trips")`
- `apps/web/src/app/(auth)/complete-profile/page.tsx` — `router.push("/trips")`
- `apps/web/src/app/(app)/trips/[id]/not-found.tsx` — `href="/trips"`
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — breadcrumb and error link to `/trips`, "Return to trips"
- `apps/web/src/hooks/use-trips.ts` — `router.push("/trips")` in `useCancelTrip`, updated JSDoc comments
- `apps/web/src/app/robots.ts` — removed `/dashboard` from disallow, kept `/trips`

**Unit test files updated** (4 files):
- `apps/web/src/app/(auth)/verify/page.test.tsx` — assertion and test name updated
- `apps/web/src/app/(auth)/complete-profile/page.test.tsx` — 3 assertions and test name updated
- `apps/web/src/components/__tests__/app-header.test.tsx` — 14+ references: mockPathname, hrefs, "My Trips" text, test names
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx` — "Return to trips" text and href assertions

**E2E test files updated** (5 files):
- `apps/web/tests/e2e/helpers/auth.ts` — 10 URL references: `**/dashboard` → `**/trips`
- `apps/web/tests/e2e/auth-journey.spec.ts` — imports, variable names, URLs, step text, screenshot name
- `apps/web/tests/e2e/trip-journey.spec.ts` — imports, variable names, URLs, step text, screenshot name
- `apps/web/tests/e2e/app-shell.spec.ts` — imports, variable names, "My Trips" link text
- `apps/web/tests/e2e/itinerary-journey.spec.ts` — imports, variable names

**Documentation updated** (2 files):
- `apps/web/src/components/trip/README.md` — 3 "dashboard" references → "trips page"
- `apps/web/tests/e2e/README.md` — 6 "dashboard" references → "trips page"/"trips list"

### Verification
- **typecheck**: PASS (all 3 packages, zero errors)
- **lint**: PASS (all 3 packages)
- **tests**: PASS (shared: 185/185, api: all passed, web: 762/767 — 5 pre-existing failures)
- **grep for "dashboard"**: ZERO hits in `apps/web/src/` and `apps/web/tests/` (case-insensitive)
- **grep for "DashboardPage"**: ZERO hits anywhere in `apps/web/`
- **reviewer**: APPROVED (after 1 round of feedback fixes)

### Learnings
- Replacement files were pre-created as untracked files — the task was primarily about reference updates and cleanup, not file creation
- The E2E page object pattern (`DashboardPage` → `TripsPage`) required updating imports and variable names across 5 spec files plus the barrel export
- Screenshot names in E2E tests should also be updated during renames to avoid confusion
- JSDoc comments and README documentation are easy to miss — always do a case-insensitive grep sweep for the old term after making changes
- The `app-header.test.tsx` file had the most references (14+) — the active styling tests for nav links are particularly sensitive to pathname and text changes
- The `robots.ts` disallow list needed `/dashboard` removed entirely (not replaced) since `/trips` was already there
