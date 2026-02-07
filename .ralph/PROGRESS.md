# Ralph Progress

Tracking implementation progress for this project.

## Iteration 1 — Task 1.1: Move trip types to shared package, extract duplicated utilities/constants, centralize API_URL, and configure bundle optimizations

**Status**: ✅ COMPLETE
**Date**: 2026-02-07

### Changes Made

**New files created (4):**
- `shared/types/trip.ts` — Trip, TripSummary, TripDetail, and API response type interfaces
- `apps/web/src/lib/format.ts` — Extracted `formatDateRange` and `getInitials` with hoisted `Intl.DateTimeFormat` instances
- `apps/web/src/lib/format.test.ts` — 13 unit tests for formatDateRange and getInitials
- `apps/web/src/lib/constants.ts` — Extracted `TIMEZONES` array with `as const`

**Modified files (11):**
- `shared/types/index.ts` — Added trip type re-exports
- `shared/index.ts` — Added trip types to barrel export
- `apps/web/src/hooks/use-trips.ts` — Replaced 7 local type definitions with imports from `@tripful/shared/types`, re-exports Trip/TripSummary/TripDetail for backward compatibility
- `apps/web/src/components/trip/trip-card.tsx` — Removed duplicate formatDateRange/getInitials, imported from `@/lib/format`
- `apps/web/src/app/(app)/trips/[id]/page.tsx` — Removed duplicate formatDateRange/getInitials, imported from `@/lib/format`
- `apps/web/src/app/(auth)/complete-profile/page.tsx` — Removed local TIMEZONES, imported from `@/lib/constants`
- `apps/web/src/components/trip/create-trip-dialog.tsx` — Removed local TIMEZONES, hoisted phone regex to `PHONE_REGEX` module constant
- `apps/web/src/components/trip/edit-trip-dialog.tsx` — Removed local TIMEZONES, imported from `@/lib/constants`
- `apps/web/src/lib/api.ts` — Exported `API_URL` constant
- `apps/web/src/app/providers/auth-provider.tsx` — Removed local API_URL, imported from `@/lib/api`
- `apps/web/src/components/trip/image-upload.tsx` — Removed inline apiUrl, imported `API_URL` from `@/lib/api`
- `apps/web/next.config.ts` — Added `experimental.optimizePackageImports: ["lucide-react"]` and `images.remotePatterns`

### Verification Results

- **Lint**: ✅ PASS — All 3 packages (shared, api, web) passed with no warnings/errors
- **Typecheck**: ✅ PASS — All 3 packages passed with no type errors
- **Tests**: ✅ PASS — 834 tests across 39 test files (83 shared + 374 API + 377 web), 0 failures

### Reviewer Verdict

**APPROVED** — Clean implementation with only LOW severity notes:
- `GetTripDetailResponse` renamed to `GetTripResponse` in shared (improvement, not a concern since it was never exported)
- `CancelTripResponse` intentionally kept local in use-trips.ts (private, different shape)
- Minor JSDoc style inconsistency vs user.ts (no per-property comments) — cosmetic, can address later

### Learnings for Future Iterations

- **Backward compatibility via re-exports**: When moving types to a shared package, re-export them from the original location (`export type { Trip, TripSummary, TripDetail }`) to avoid breaking downstream consumers. This let us avoid modifying any test files.
- **`as const` on TIMEZONES**: Adding `as const` provides readonly guarantees and literal types at no cost.
- **Hoisted formatters**: `Intl.DateTimeFormat` instances are expensive to create. Module-scope hoisting is a clean pattern for shared utility files.
- **API_URL centralization**: Simply adding `export` to the existing constant in `api.ts` and importing elsewhere was the simplest approach — no need for environment utility abstraction.
- **image-upload test**: When centralizing module-level constants, tests that manipulated `process.env` at runtime need updating since the constant is captured at import time.

