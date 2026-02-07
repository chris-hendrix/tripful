# Tasks: Frontend Best Practices

## Phase 1: Foundation — Shared Types, Code Deduplication & Bundle Config

- [x] Task 1.1: Move trip types to shared package, extract duplicated utilities/constants, centralize API_URL, and configure bundle optimizations
  - Implement: Create `shared/types/trip.ts` with `TripSummary`, `TripDetail`, `GetTripsResponse`, `GetTripResponse`, `CreateTripResponse`, `UpdateTripResponse` interfaces. Export from `shared/types/index.ts`.
  - Implement: Update `apps/web/src/hooks/use-trips.ts` to import types from `@tripful/shared/types` instead of defining them locally. Remove the local type definitions.
  - Implement: Create `apps/web/src/lib/format.ts` — extract `formatDateRange` and `getInitials` from `trip-card.tsx` and `trips/[id]/page.tsx`. Hoist `Intl.DateTimeFormat` instances to module scope.
  - Implement: Create `apps/web/src/lib/constants.ts` — extract `TIMEZONES` array from `complete-profile/page.tsx`, `create-trip-dialog.tsx`, `edit-trip-dialog.tsx`.
  - Implement: Export `API_URL` from `apps/web/src/lib/api.ts`. Update `auth-provider.tsx` and `image-upload.tsx` to import from `@/lib/api` instead of redefining.
  - Implement: Add `experimental: { optimizePackageImports: ["lucide-react"] }` to `apps/web/next.config.ts`.
  - Implement: Add `images: { remotePatterns: [{ protocol: "https", hostname: "**" }] }` to `apps/web/next.config.ts`.
  - Implement: Hoist phone validation regex to module scope in `create-trip-dialog.tsx`.
  - Test: Run `pnpm typecheck` to verify shared types compile and all imports resolve.
  - Test: Run `pnpm test` to verify no regressions from import changes.
  - Verify: `pnpm lint && pnpm typecheck && pnpm test`

## Phase 2: Next.js Features — Fonts, Images, Error Boundaries, Metadata, Loading

- [ ] Task 2.1: Add next/font for Playfair Display, replace all `<img>` with next/image, create error boundaries, add metadata and loading files
  - Implement: Create `apps/web/src/lib/fonts.ts` with `Playfair_Display` from `next/font/google`, exported as `playfairDisplay` with CSS variable `--font-playfair`.
  - Implement: Update `apps/web/src/app/layout.tsx` — import `playfairDisplay`, add `className={playfairDisplay.variable}` to `<html>`. Update metadata to use title template: `title: { default: "Tripful", template: "%s | Tripful" }`.
  - Implement: Replace all `style={{ fontFamily: "Playfair Display, serif" }}` with `className="font-[family-name:var(--font-playfair)]"` across dashboard page (6), trip detail page (3), trip-card (1), create-trip-dialog (1), edit-trip-dialog (1).
  - Implement: Replace `<img>` tags with `next/image` `Image` in `trip-card.tsx` (cover + avatars), `trips/[id]/page.tsx` (cover + avatars), `image-upload.tsx` (preview with `unoptimized`). Use `fill` + `sizes` for cover images, `priority` for above-the-fold hero.
  - Implement: Create error boundaries — `apps/web/src/app/global-error.tsx` (with `<html>/<body>`), `apps/web/src/app/not-found.tsx`, `apps/web/src/app/(app)/error.tsx`, `apps/web/src/app/(auth)/error.tsx`. All `error.tsx` files are `"use client"` with `error`/`reset` props.
  - Implement: Create `apps/web/src/app/robots.ts` and `apps/web/src/app/sitemap.ts`.
  - Implement: Create `apps/web/src/app/(app)/dashboard/loading.tsx` — extract existing `SkeletonCard` component into loading file.
  - Implement: Create `apps/web/src/app/(app)/trips/[id]/loading.tsx` — extract existing `SkeletonDetail` component into loading file.
  - Test: Run `pnpm typecheck` to verify next/image and next/font imports.
  - Test: Update any tests that assert on `<img>` tags or inline font styles to match new markup.
  - Test: Run `pnpm test` to verify no regressions.
  - Verify: `pnpm lint && pnpm typecheck && pnpm test`

## Phase 3: TanStack Query v5 & React Performance

- [ ] Task 3.1: Implement TanStack Query best practices (isPending, queryOptions factory, query client config, devtools, ESLint plugin) and React performance optimizations (memo, useCallback, navigation, deduplication)
  - Implement: Install `@tanstack/react-query-devtools` and `@tanstack/eslint-plugin-query` as dev dependencies. Add ESLint plugin to `eslint.config.js`.
  - Implement: Create `apps/web/src/lib/get-query-client.ts` with server/browser singleton pattern, `dehydrate` config including `shouldDehydrateQuery` for pending queries.
  - Implement: Update `apps/web/src/app/providers/providers.tsx` — use `getQueryClient()`, add `<ReactQueryDevtools initialIsOpen={false} />`, remove inline `useState(() => new QueryClient(...))`.
  - Implement: In `apps/web/src/hooks/use-trips.ts` — add `tripKeys` factory and `tripsQueryOptions`/`tripDetailQueryOptions` using `queryOptions()`. Export these for server-side prefetching. Update `useTrips`/`useTripDetail` to use the options factories.
  - Implement: In `use-trips.ts` — replace all `isLoading` references with `isPending` in JSDoc examples. Add `mutationKey` to all three mutation hooks. Remove duplicate `invalidateQueries` from `onSuccess` (keep only in `onSettled`). Add `usePrefetchTrip(tripId)` hook.
  - Implement: Update `apps/web/src/lib/api.ts` — accept and forward `AbortSignal` parameter. Export `API_URL` constant if not done in Phase 1.
  - Implement: Update query hooks to pass `signal` from query context to `apiRequest`.
  - Implement: In `apps/web/src/components/trip/trip-card.tsx` — wrap in `React.memo()`. Replace `router.push` with `<Link>` for navigation. Add `onMouseEnter`/`onFocus` with `usePrefetchTrip` for hover prefetching.
  - Implement: In `apps/web/src/app/(app)/trips/[id]/page.tsx` — replace "Return to dashboard" `router.push` with `<Link>`.
  - Implement: In `apps/web/src/app/providers/auth-provider.tsx` — wrap `login`, `verify`, `completeProfile`, `logout`, `fetchUser` in `useCallback`. Memoize context value with `useMemo`.
  - Implement: In `apps/web/src/app/(app)/dashboard/page.tsx` — replace `isLoading` with `isPending`. Combine double `.filter()` for upcoming/past trips into single loop.
  - Implement: In `apps/web/src/app/(app)/trips/[id]/page.tsx` — replace `isLoading` with `isPending`.
  - Implement: In `apps/web/src/app/(auth)/verify/page.tsx` and `complete-profile/page.tsx` — simplify navigation by removing `shouldNavigate` state + useEffect, navigating directly in async handlers.
  - Test: Update `use-trips.test.tsx` — replace all `isLoading` assertions with `isPending`. Remove deprecated `logger` option from test QueryClient instances.
  - Test: Update `dashboard/page.test.tsx` — replace `isLoading` mock values with `isPending`.
  - Test: Update `trips/[id]/page.test.tsx` — replace `isLoading` mock values with `isPending`.
  - Test: Run `pnpm test` to verify all updates.
  - Verify: `pnpm lint && pnpm typecheck && pnpm test`

## Phase 4: RSC Migration & Server-Side Prefetching

- [ ] Task 4.1: Convert protected layout to server component auth guard, migrate dashboard and trip detail pages to RSC with TanStack Query hydration, add dynamic imports with preloading
  - Implement: Create `apps/web/src/lib/server-api.ts` with `serverApiRequest` that reads `auth_token` cookie via `cookies()` from `next/headers` and forwards as `Authorization: Bearer` header. Uses server-side `API_URL` env var (non-public).
  - Implement: Add `API_URL=http://localhost:8000/api` to `apps/web/.env.local.example` and `apps/web/.env.local`.
  - Implement: Convert `apps/web/src/app/(app)/layout.tsx` from client component to server component — remove `"use client"`, import `cookies` from `next/headers` and `redirect` from `next/navigation`, check for `auth_token` cookie, redirect to `/login` if missing.
  - Implement: Create `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` — move all existing dashboard page logic (search, filtering, trip cards, dialogs, state) to this `"use client"` component. Use dynamic imports for `CreateTripDialog` with `next/dynamic` + `{ ssr: false }`. Add preload on hover/focus for the FAB and "Create your first trip" buttons.
  - Implement: Rewrite `apps/web/src/app/(app)/dashboard/page.tsx` as server component — import `dehydrate`, `HydrationBoundary` from `@tanstack/react-query`, `getQueryClient` from `@/lib/get-query-client`, `tripsQueryOptions` from `@/hooks/use-trips`. Prefetch trips query, wrap `<DashboardContent />` in `<HydrationBoundary>`. Export `metadata = { title: "Dashboard" }`.
  - Implement: Create `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — move all existing trip detail page logic to this `"use client"` component. Receives `tripId` as prop (no `useParams()`). Use dynamic import for `EditTripDialog` with `next/dynamic` + `{ ssr: false }`. Add preload on hover/focus for the "Edit trip" button.
  - Implement: Rewrite `apps/web/src/app/(app)/trips/[id]/page.tsx` as server component — prefetch trip detail query via `tripDetailQueryOptions(id)`, wrap `<TripDetailContent tripId={id} />` in `<HydrationBoundary>`. Export `generateMetadata` for page title.
  - Test: Update `dashboard/page.test.tsx` — test the new `DashboardContent` component directly, or mock it at the page level and test the server component renders `HydrationBoundary`.
  - Test: Update `trips/[id]/page.test.tsx` — same approach for `TripDetailContent`.
  - Test: Update E2E tests if selectors changed.
  - Test: Run `pnpm test` and `pnpm test:e2e` to verify auth flow, dashboard, and trip detail still work.
  - Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`

## Phase 5: Final Verification

- [ ] Task 5.1: Full regression check and E2E validation
  - Verify: `pnpm lint` — all linting passes
  - Verify: `pnpm typecheck` — all type checking passes
  - Verify: `pnpm test` — all unit/integration tests pass
  - Verify: `pnpm test:e2e` — all E2E tests pass (auth flow, trip CRUD)
  - Verify: `pnpm build` — production build succeeds (catches SSR/RSC issues)
