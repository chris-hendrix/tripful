# Phase 5.5: User Profile & Auth Redirects - Tasks

## Phase 1: Schema & Shared Types

- [x] Task 1.1: Update DB schema, shared types, and Zod schemas for nullable timezone, handles column, and profile updates
  - Implement: In `apps/api/src/db/schema/index.ts`, change `timezone` from `.notNull().default("UTC")` to nullable, add `handles: jsonb("handles").$type<Record<string, string>>()`
  - Implement: Run `cd apps/api && pnpm db:generate` to generate migration, then `pnpm db:migrate` to apply
  - Implement: In `shared/types/user.ts`, change `timezone: string` to `timezone: string | null`, add `handles: Record<string, string> | null`
  - Implement: In `shared/types/invitation.ts`, add `handles: Record<string, string> | null` to `MemberWithProfile`
  - Implement: In `shared/schemas/auth.ts`, update `userResponseSchema` timezone to `z.string().nullable()`, add `handles: z.record(z.string(), z.string()).nullable().optional()`, update `completeProfileSchema` timezone to `z.string().nullable().optional()`
  - Implement: Create `shared/schemas/user.ts` with `updateProfileSchema`, `userHandlesSchema`, `ALLOWED_HANDLE_PLATFORMS`
  - Implement: In `shared/schemas/invitation.ts`, add `handles` to `memberWithProfileSchema`
  - Implement: Update barrel exports in `shared/schemas/index.ts` and `shared/types/index.ts`
  - Test: Run `pnpm typecheck` to verify all types compile
  - Verify: Run full test suite, fix any failures from the type changes

## Phase 2: Backend API

- [x] Task 2.1: Create user routes, controller, and extend auth service for profile management
  - Implement: Extend `updateProfile()` in `apps/api/src/services/auth.service.ts` to accept `timezone: string | null`, `profilePhotoUrl: string | null`, and `handles: Record<string, string> | null`
  - Implement: Update `updateProfile()` interface in auth service to match new signature
  - Implement: Create `apps/api/src/controllers/user.controller.ts` with `updateProfile`, `uploadProfilePhoto`, `removeProfilePhoto` methods
  - Implement: Create `apps/api/src/routes/user.routes.ts` with `PUT /me`, `POST /me/photo`, `DELETE /me/photo`
  - Implement: Register user routes in `apps/api/src/app.ts` at prefix `/api/users`
  - Implement: Update `getMembers()` in invitation service to include `handles` in joined user fields
  - Test: Write integration tests for all three endpoints (happy path, auth required, validation errors, photo upload/replace/remove, handles CRUD)
  - Verify: Run full test suite, all tests pass

## Phase 3: Dashboard to /trips Rename

- [x] Task 3.1: Move dashboard files to /trips and update all references across codebase
  - Implement: Move `apps/web/src/app/(app)/dashboard/page.tsx` → `apps/web/src/app/(app)/trips/page.tsx`
  - Implement: Move + rename `dashboard-content.tsx` → `trips-content.tsx` in `(app)/trips/`
  - Implement: Move + rename `dashboard-content.test.tsx` → `trips-content.test.tsx` in `(app)/trips/`
  - Implement: Move `page.test.tsx` and `loading.tsx` to `(app)/trips/`
  - Implement: Delete `apps/web/src/app/(app)/dashboard/` directory
  - Implement: Update all `/dashboard` → `/trips` references in source files: `verify/page.tsx`, `complete-profile/page.tsx`, `trips/[id]/not-found.tsx`, `trips/[id]/trip-detail-content.tsx`, `app-header.tsx` (also rename nav text to "My Trips"), `use-trips.ts`, `robots.ts`
  - Implement: Update all `/dashboard` → `/trips` in test files: `verify/page.test.tsx`, `complete-profile/page.test.tsx`, `trip-detail-content.test.tsx`, `app-header.test.tsx`
  - Implement: Update all `/dashboard` → `/trips` in E2E tests: `auth-journey.spec.ts`, `trip-journey.spec.ts`
  - Test: Run `pnpm typecheck` to verify no broken imports
  - Verify: Run full test suite (unit + E2E), all tests pass

## Phase 4: Auth Redirects

- [x] Task 4.1: Add server-side auth redirects to landing page and auth layout
  - Implement: Convert `apps/web/src/app/page.tsx` to async server component with cookie check, redirect to `/trips` if authenticated
  - Implement: Add cookie check to `apps/web/src/app/(auth)/layout.tsx`, redirect to `/trips` if authenticated
  - Test: Write E2E tests: authenticated user visiting `/` redirects to `/trips`, authenticated user visiting `/login` redirects to `/trips`
  - Verify: Run full test suite, all tests pass

## Phase 5: Profile Page & Handles

- [x] Task 5.1: Create profile page with form, photo upload/remove, timezone auto-detect, handles, and member dialog updates
  - Implement: Create `apps/web/src/app/(app)/profile/page.tsx` (server component wrapper)
  - Implement: Create `apps/web/src/hooks/use-user.ts` with `useUpdateProfile`, `useUploadProfilePhoto`, `useRemoveProfilePhoto` TanStack Query mutations
  - Implement: Create `apps/web/src/components/profile/profile-form.tsx` with React Hook Form: display name, phone (read-only), timezone with "Auto-detect" option, Venmo/Instagram handle inputs, profile photo upload/remove
  - Implement: Add "Auto-detect" as first timezone option using sentinel value. When selected, submit `timezone: null`. Label dynamically shows detected timezone.
  - Implement: Update `apps/web/src/components/itinerary/itinerary-view.tsx` timezone fallback from `"UTC"` to `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - Implement: Update `apps/web/src/components/trip/members-list.tsx` to show Venmo/Instagram handles as clickable links on member cards
  - Test: Write E2E tests for profile page: navigate from header dropdown, edit display name, upload photo, remove photo, verify handles display in members dialog
  - Verify: Run full test suite, all tests pass

## Phase 6: Complete Profile Updates

- [ ] Task 6.1: Add optional photo upload and auto-detect timezone to complete-profile page
  - Implement: Add optional circular avatar upload area to `apps/web/src/app/(auth)/complete-profile/page.tsx` above the display name field
  - Implement: Replace timezone dropdown default with "Auto-detect" option (don't send timezone when auto-detect is selected)
  - Implement: Update redirect from `/dashboard` to `/trips` (if not already done in Phase 3)
  - Implement: After profile completion, upload photo if selected (second API call to `POST /api/users/me/photo`)
  - Test: Update existing complete-profile tests for new timezone behavior and redirect
  - Verify: Run full test suite, all tests pass

## Phase 7: Final Verification

- [ ] Task 7.1: Full regression check
  - Verify: All unit tests pass (`pnpm test`)
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: Type checking passes (`pnpm typecheck`)
