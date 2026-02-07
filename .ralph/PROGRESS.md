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

## Iteration 2 — Task 2.1: Add next/font for Playfair Display, replace all `<img>` with next/image, create error boundaries, add metadata and loading files

**Status**: ✅ COMPLETE
**Date**: 2026-02-07

### Changes Made

**New files created (9):**
- `apps/web/src/lib/fonts.ts` — Playfair Display font configuration using `next/font/google` with CSS variable `--font-playfair`
- `apps/web/src/app/global-error.tsx` — Root-level error boundary with `<html>` and `<body>` tags (client component)
- `apps/web/src/app/not-found.tsx` — Custom 404 page with link back to home (server component)
- `apps/web/src/app/(app)/error.tsx` — App route group error boundary (client component)
- `apps/web/src/app/(auth)/error.tsx` — Auth route group error boundary (client component)
- `apps/web/src/app/robots.ts` — SEO robots.txt configuration disallowing `/dashboard` and `/trips`
- `apps/web/src/app/sitemap.ts` — SEO sitemap with root and login pages
- `apps/web/src/app/(app)/dashboard/loading.tsx` — Route-level loading skeleton for dashboard (3 skeleton cards in grid)
- `apps/web/src/app/(app)/trips/[id]/loading.tsx` — Route-level loading skeleton for trip detail

**Modified files (7):**
- `apps/web/src/app/layout.tsx` — Added `playfairDisplay.variable` CSS class to `<html>`, updated metadata to title template `{ default: "Tripful", template: "%s | Tripful" }`
- `apps/web/src/app/(app)/dashboard/page.tsx` — Replaced 6 inline `style={{ fontFamily: "Playfair Display, serif" }}` with `font-[family-name:var(--font-playfair)]` className
- `apps/web/src/app/(app)/trips/[id]/page.tsx` — Replaced 3 inline font styles with className, replaced 2 `<img>` tags with `next/image` (cover with `fill`+`priority`, avatars with `width`/`height`)
- `apps/web/src/components/trip/trip-card.tsx` — Replaced 1 inline font style, replaced 2 `<img>` tags with `next/image` (cover with `fill`+`sizes`, avatars with `width`/`height`)
- `apps/web/src/components/trip/create-trip-dialog.tsx` — Replaced `font-serif` + inline style with `font-[family-name:var(--font-playfair)]`
- `apps/web/src/components/trip/edit-trip-dialog.tsx` — Same as create-trip-dialog
- `apps/web/src/components/trip/image-upload.tsx` — Replaced `<img>` with `next/image` using `unoptimized` for blob URL support

**Test files updated (5):**
- `apps/web/src/components/trip/__tests__/trip-card.test.tsx` — Added `next/image` mock
- `apps/web/src/app/(app)/trips/[id]/page.test.tsx` — Added `next/image` mock
- `apps/web/src/components/trip/__tests__/image-upload.test.tsx` — Added `next/image` mock
- `apps/web/src/components/trip/__tests__/create-trip-dialog.test.tsx` — Updated font assertion from `style.fontFamily` to `className` check
- `apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx` — Same font assertion update

### Verification Results

- **Lint**: ✅ PASS — All 3 packages passed with no warnings/errors
- **Typecheck**: ✅ PASS — All 3 packages passed with no type errors
- **Tests**: ✅ PASS — 834 tests across 39 test files (83 shared + 374 API + 377 web), 0 failures
- **File existence**: ✅ PASS — All 9 new files confirmed present
- **Inline font removal**: ✅ PASS — Zero remaining `fontFamily: "Playfair Display"` in source
- **Native `<img>` removal**: ✅ PASS — Zero remaining `<img>` tags in converted files

### Reviewer Verdict

**APPROVED** — Clean implementation with only LOW severity notes:
- `images.remotePatterns` uses wildcard `hostname: "**"` — acceptable for dev/early-stage, should be narrowed for production
- Hardcoded `tripful.com` domain in `robots.ts` and `sitemap.ts` — could use env var for flexibility
- `(app)/error.tsx` and `(auth)/error.tsx` are near-identical — acceptable since they may diverge as the app grows
- `global-error.tsx` exposes `error.message` — mitigated by Next.js production error sanitization

### Learnings for Future Iterations

- **next/image mock pattern**: Mock `next/image` in vitest as `({ src, alt, fill, priority, unoptimized, sizes, ...props }) => <img src={src} alt={alt} {...props} />` — destructure known Image-specific props to prevent them being passed to DOM `<img>`, preserving all existing `.src` and `getAttribute("src")` assertions.
- **Font CSS variable approach**: `font-[family-name:var(--font-playfair)]` is the correct Tailwind v4 arbitrary value syntax for CSS variable fonts. Applied via `playfairDisplay.variable` on `<html>` element.
- **Skeleton dual-purpose**: Keep `SkeletonCard`/`SkeletonDetail` in page files for client-side TanStack Query loading state alongside the new `loading.tsx` files for route-level Suspense — they serve different purposes.
- **`unoptimized` for blob URLs**: `next/image` cannot optimize `blob:` URLs, so `unoptimized` prop is required for image upload previews.
- **Error boundary conventions**: `global-error.tsx` must include its own `<html>/<body>` since it replaces the root layout. `not-found.tsx` is NOT a client component. All `error.tsx` files ARE client components.

