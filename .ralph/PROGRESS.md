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

## Iteration 3 — Task 3.1: Implement TanStack Query best practices (isPending, queryOptions factory, query client config, devtools, ESLint plugin) and React performance optimizations (memo, useCallback, navigation, deduplication)

**Status**: ✅ COMPLETE
**Date**: 2026-02-07

### Changes Made

**New files created (1):**
- `apps/web/src/lib/get-query-client.ts` — Server/browser QueryClient singleton with dehydration support for SSR hydration (`shouldDehydrateQuery` includes pending queries)

**Modified files (11):**
- `apps/web/package.json` — Added `@tanstack/react-query-devtools` and `@tanstack/eslint-plugin-query` as devDependencies
- `apps/web/.eslintrc.json` — Added `"plugin:@tanstack/query/recommended"` to extends array
- `apps/web/src/app/providers/providers.tsx` — Replaced `useState(new QueryClient)` with `getQueryClient()`, added `ReactQueryDevtools`
- `apps/web/src/hooks/use-trips.ts` — Added `tripKeys` factory, `tripsQueryOptions`/`tripDetailQueryOptions` using `queryOptions()`, `usePrefetchTrip` hook, `mutationKey` on all 3 mutations, removed duplicate `invalidateQueries` from `onSuccess` (kept only in `onSettled`), pass `signal` for abort support, updated JSDoc to `isPending`
- `apps/web/src/components/trip/trip-card.tsx` — Wrapped with `React.memo`, replaced `useRouter`+`handleClick` with `<Link>` from `next/link`, added `usePrefetchTrip` for hover/focus prefetch, removed manual `role="button"`/`tabIndex`/`onKeyDown`
- `apps/web/src/app/(app)/dashboard/page.tsx` — Replaced `isLoading` with `isPending`, replaced double `.filter()` with single-loop partition
- `apps/web/src/app/(app)/trips/[id]/page.tsx` — Replaced `isLoading` with `isPending`, replaced "Return to dashboard" `router.push` with `<Link>`, removed unused `useRouter`
- `apps/web/src/app/providers/auth-provider.tsx` — Wrapped `fetchUser`, `login`, `verify`, `completeProfile`, `logout` with `useCallback`, memoized context value with `useMemo`, added `fetchUser` to `useEffect` deps
- `apps/web/src/app/(auth)/verify/page.tsx` — Removed `shouldNavigate` state + `useEffect`, navigate directly in `onSubmit`
- `apps/web/src/app/(auth)/complete-profile/page.tsx` — Removed `shouldNavigate` state + `useEffect`, navigate directly after `completeProfile()`

**Test files updated (4):**
- `apps/web/src/hooks/__tests__/use-trips.test.tsx` — Removed all 3 deprecated `logger` blocks from QueryClient, replaced `isLoading` assertions with `isPending`, added `signal` parameter assertions
- `apps/web/src/app/(app)/dashboard/page.test.tsx` — Replaced all `isLoading` mock values with `isPending`
- `apps/web/src/app/(app)/trips/[id]/page.test.tsx` — Replaced all `isLoading` mock values with `isPending`, added `next/link` mock, updated "Return to dashboard" test from `router.push` to link href check
- `apps/web/src/components/trip/__tests__/trip-card.test.tsx` — Added `next/link` mock, added `usePrefetchTrip` mock, replaced navigation tests from `role="button"` + `router.push` to `role="link"` + href checks, added prefetch-on-hover test

### Verification Results

- **Lint**: ✅ PASS — All 3 packages (shared, api, web) passed with no warnings/errors
- **Typecheck**: ✅ PASS — All 3 packages passed with no type errors
- **Tests**: ✅ PASS — 834 tests across 39 test files (83 shared + 374 API + 377 web), 0 failures
- **Dependencies**: ✅ PASS — `@tanstack/react-query-devtools` and `@tanstack/eslint-plugin-query` installed
- **isLoading removal**: ✅ PASS — Zero `isLoading` references in dashboard/page.tsx and trips/[id]/page.tsx source
- **New file**: ✅ PASS — `get-query-client.ts` exists

### Reviewer Verdict

**APPROVED** — All 10 task requirements correctly implemented. Only LOW severity notes:
- `@tanstack/react-query-devtools` in devDependencies (standard community pattern; tree-shakes in production)
- Default retry behavior changed from `retry: 1` to TanStack Query default `retry: 3` via `getQueryClient` (intentional configuration update)
- Mutation keys use inline arrays rather than a factory (acceptable since mutation keys are primarily for devtools identification)

### Learnings for Future Iterations

- **queryOptions factory pattern**: `queryOptions()` from TanStack Query v5 provides type-safe, reusable query configurations. Export these alongside hooks so server components can use them for prefetching in Phase 4.
- **Signal forwarding**: Destructure `{ signal }` from `queryFn` context and pass to `apiRequest` — enables automatic request cancellation on component unmount. The `apiRequest` function already spreads `RequestInit` options including `signal`.
- **getQueryClient singleton**: Server-side creates a new client per request (avoids state leaks between SSR requests), browser-side reuses a module-level singleton. The `dehydrate` config with `shouldDehydrateQuery` including pending queries is essential for Phase 4 RSC hydration.
- **Link vs router.push for navigation**: `<Link>` from `next/link` provides prefetching, accessibility (renders as `<a>`), and native browser behaviors (middle-click, right-click). Add `block` class for block-level display. Manual `role="button"`/`tabIndex`/`onKeyDown` can be removed since `<a>` handles keyboard navigation natively.
- **useCallback dependency arrays**: Auth provider functions that only use module constants (`API_URL`) and stable state setters (`setUser`, `setLoading`) can safely use `[]` as dependencies. Only `logout` needs `[router]` since it calls `router.push`.
- **shouldNavigate elimination**: The `shouldNavigate` state + `useEffect` pattern for post-async navigation is unnecessary in React 18+ — navigate directly in async handlers after `await`.
- **ESLint legacy format**: The project uses `.eslintrc.json` (not flat config). TanStack Query plugin is added as `"plugin:@tanstack/query/recommended"` in the `extends` array.

## Iteration 4 — Task 4.1: Convert protected layout to server component auth guard, migrate dashboard and trip detail pages to RSC with TanStack Query hydration, add dynamic imports with preloading

**Status**: ✅ COMPLETE
**Date**: 2026-02-07

### Changes Made

**New files created (3):**
- `apps/web/src/lib/server-api.ts` — Server-side API client that reads `auth_token` cookie via `cookies()` from `next/headers` and forwards as `Authorization: Bearer` header. Uses `process.env.API_URL` (non-public, server-side only).
- `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` — Extracted `"use client"` component with all dashboard logic (search, filtering, trip cards, dialogs, state). Uses `next/dynamic` for `CreateTripDialog` with `ssr: false`. Adds `preloadCreateTripDialog` on `onMouseEnter`/`onFocus` for FAB and "Create your first trip" buttons.
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — Extracted `"use client"` component with all trip detail logic. Accepts `tripId` as prop (no more `useParams()`). Uses `next/dynamic` for `EditTripDialog` with `ssr: false`. Adds `preloadEditTripDialog` on `onMouseEnter`/`onFocus` for "Edit trip" button.

**Rewritten files (3):**
- `apps/web/src/app/(app)/layout.tsx` — Converted from `"use client"` component (using `useAuth()` + `useEffect` + `useRouter`) to async server component using `cookies()` from `next/headers` and `redirect()` from `next/navigation`. Checks for `auth_token` cookie presence, redirects to `/login` if missing.
- `apps/web/src/app/(app)/dashboard/page.tsx` — Converted to RSC. Uses `serverApiRequest` to fetch trips server-side with cookie forwarding, populates TanStack Query cache via `setQueryData(tripKeys.all, ...)`, wraps `DashboardContent` in `HydrationBoundary`. Exports `metadata = { title: "Dashboard" }`.
- `apps/web/src/app/(app)/trips/[id]/page.tsx` — Converted to async RSC. Awaits `params` (Next.js 15+ Promise pattern), uses `serverApiRequest` to fetch trip detail server-side, populates cache via `setQueryData(tripKeys.detail(id), ...)`, wraps `TripDetailContent` in `HydrationBoundary`. Exports `generateMetadata` for page title.

**Modified files (2):**
- `apps/web/.env.local` — Added `API_URL=http://localhost:8000/api` (server-side only)
- `apps/web/.env.local.example` — Added `API_URL` with documentation comments

**Test files updated (3):**
- `apps/web/src/app/(app)/layout.test.tsx` — Completely rewritten for server component testing. Mocks `cookies()` from `next/headers` and `redirect()` from `next/navigation`. Calls `ProtectedLayout()` directly as async function. Tests: auth cookie present (renders children), cookie missing (redirects), empty cookie value (redirects), correct cookie name verification.
- `apps/web/src/app/(app)/dashboard/page.test.tsx` — Changed import from `DashboardPage` to `DashboardContent`. Added `next/dynamic` mock using `React.lazy`/`React.Suspense`. Added `Suspense` wrapper in `renderWithClient`. All 22 test cases preserved.
- `apps/web/src/app/(app)/trips/[id]/page.test.tsx` — Changed import from `TripDetailPage` to `TripDetailContent`. Added `next/dynamic` mock. Removed `useParams` mock. Passes `tripId="trip-123"` as prop with `Suspense` wrapper. All 32 test cases preserved.

### Verification Results

- **Lint**: ✅ PASS — All 3 packages (shared, api, web) passed with no warnings/errors
- **Typecheck**: ✅ PASS — All 3 packages passed with no type errors
- **Tests**: ✅ PASS — 833 tests across all test files (83 shared + 374 API + 376 web), 0 failures

### Reviewer Verdict

**APPROVED** (second review, after fixes) — First review returned NEEDS_WORK with two issues:
1. Layout test file not updated for server component (4 test failures)
2. `server-api.ts` created but not integrated into RSC prefetch flow

Both issues were fixed in the same iteration:
- Layout tests rewritten for async server component pattern
- RSC pages switched from `prefetchQuery(clientQueryOptions)` to `serverApiRequest` + `setQueryData` for proper server-side cookie forwarding
- `server-api.ts` updated with `await` before `response.json()`

Only LOW severity suggestion remaining: Consider adding tests that call the RSC page functions directly (similar to layout tests) to verify the `serverApiRequest` + `setQueryData` + `dehydrate` pipeline.

### Learnings for Future Iterations

- **Async server component testing**: Call the component function directly with `await ProtectedLayout({ children: ... })` rather than using `render()`. Mock `cookies()` from `next/headers` and `redirect()` from `next/navigation`. Next.js's `redirect()` throws a `NEXT_REDIRECT` error — test with `rejects.toThrow()`.
- **Server-side cookie forwarding**: `apiRequest` with `credentials: "include"` only works in browser context. For RSC pages, use `serverApiRequest` which reads cookies via `next/headers` `cookies()` and forwards as `Authorization: Bearer` header.
- **setQueryData vs prefetchQuery for RSC**: When server-side data fetching uses a different API client (not the client-side `queryFn`), use `queryClient.setQueryData()` to populate the cache directly rather than `prefetchQuery()` which would try to use the client-side `queryFn`.
- **try/catch for RSC prefetch**: Always wrap server-side data fetching in try/catch. If it fails (e.g., cookie not available, network issue), the client component will re-fetch on mount via its own `useQuery` hook.
- **next/dynamic mock for tests**: Mock `next/dynamic` with `React.lazy` + `React.Suspense` wrapper. Since `vi.mock` intercepts all module imports regardless of loading method, existing component mocks work with dynamic imports. Wrap test renders in `<Suspense fallback={null}>`.
- **Named exports with next/dynamic**: Use `.then((mod) => ({ default: mod.NamedExport }))` pattern since `next/dynamic` expects a default export.
- **Next.js 15+ params Promise**: In the App Router, `params` is a `Promise<{ id: string }>` that must be awaited. Both `page.tsx` and `generateMetadata` receive it as a Promise.
- **Preload pattern for dynamic imports**: Create a module-level function `const preloadX = () => void import("@/components/path")` and attach to `onMouseEnter`/`onFocus` on trigger buttons.
- **Test count may vary**: After RSC migration, some tests test the extracted client component directly rather than the page wrapper. The total test count may decrease by 1 (from 834 to 833) if a test file structure changes.

