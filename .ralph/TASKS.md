# Tasks: Skill Audit Remediation

## Phase 1: Database Schema & Infrastructure

- [x] Task 1.1: Create security and rate limiting database tables with partial indexes
  - Implement: Add `blacklisted_tokens` table to `apps/api/src/db/schema/index.ts` (id, jti unique, userId FK, expiresAt, createdAt) with indexes on jti and expiresAt
  - Implement: Add `auth_attempts` table (phoneNumber PK, failedCount, lastFailedAt, lockedUntil)
  - Implement: Add `rate_limit_entries` table (key PK, count, expiresAt) with index on expiresAt
  - Implement: Add partial indexes on soft-delete tables: events, accommodations, member_travel, messages (WHERE deleted_at IS NULL)
  - Implement: Run `pnpm db:generate` to create migration, review SQL
  - Test: Verify schema compiles with `pnpm typecheck`
  - Verify: run full test suite, lint, and typecheck pass

- [x] Task 1.2: Implement PostgreSQL-backed rate limit store with cleanup job
  - Implement: Create `apps/api/src/plugins/pg-rate-limit-store.ts` — custom store class with `incr` (atomic UPSERT with window reset) and `child` methods
  - Implement: Update `apps/api/src/app.ts` to pass PG store to `@fastify/rate-limit` registration
  - Implement: Add `RATE_LIMIT_CLEANUP` and `AUTH_ATTEMPTS_CLEANUP` queue names to `apps/api/src/queues/types.ts`
  - Implement: Register hourly cleanup cron job in `apps/api/src/queues/index.ts` that deletes expired rate_limit_entries
  - Test: Write unit tests for PgRateLimitStore — increment, window expiry reset, concurrent access, child store creation
  - Test: Write integration test verifying rate limiting works with PG store (hit endpoint beyond limit, verify 429)
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 1.3: Implement token blacklist with JWT jti claim and auth middleware check
  - Implement: Update JWT signing in `apps/api/src/services/auth.service.ts` to include `jti: randomUUID()` claim
  - Implement: Create token blacklist service or add methods to auth service — `blacklistToken(jti, userId, expiresAt)` and `isBlacklisted(jti)`
  - Implement: Update logout endpoint to decode token, extract jti + exp, insert into blacklisted_tokens
  - Implement: Update authenticate middleware in `apps/api/src/middleware/auth.middleware.ts` to check blacklist after jwtVerify
  - Implement: Register daily cleanup cron job in `apps/api/src/queues/index.ts` that deletes expired blacklisted_tokens
  - Test: Write unit tests for blacklist service — add token, check blacklisted, check non-blacklisted, expired cleanup
  - Test: Write integration tests — logout invalidates token (subsequent request returns 401), non-blacklisted token works, re-login after logout gets fresh token
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 1.4: Implement account lockout after failed verification attempts
  - Implement: Update verify-code logic in `apps/api/src/services/auth.service.ts` to check lockout before verification
  - Implement: On failed verify: upsert auth_attempts row (increment failedCount, set lastFailedAt, set lockedUntil after 5 failures)
  - Implement: On successful verify: delete auth_attempts row for that phone number
  - Implement: Return 429 with Retry-After header when locked
  - Implement: Register daily cleanup job for stale auth_attempts (older than 24h)
  - Test: Write unit tests — lock after 5 failures, unlock after cooldown, reset on success, respect lockout period
  - Test: Write integration tests — 5 failed verify-codes → 6th returns 429, wait 15min (mock time) → succeeds, successful verify resets counter
  - Verify: run full test suite, lint, and typecheck pass

## Phase 2: API Quality

- [ ] Task 2.1: Fix pg-boss queue configuration (expiration, DLQ, DLQ workers)
  - Implement: Add DLQ queue names to `apps/api/src/queues/types.ts` — `NOTIFICATION_BATCH_DLQ`, `DAILY_ITINERARIES_DLQ`
  - Implement: Update `apps/api/src/queues/index.ts` — create DLQ queues, add retryLimit/retryBackoff/expireInSeconds/deadLetter to notification/batch and daily-itineraries queue configs
  - Implement: Create `apps/api/src/queues/workers/dlq.worker.ts` — register workers for all 4 DLQ queues that log failed jobs at error level with full payload
  - Test: Write unit tests for DLQ worker — logs error with expected format
  - Test: Write integration test — simulate job failure, verify job lands in DLQ
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 2.2: Add Drizzle query logging plugin and input length validation
  - Implement: Create `apps/api/src/plugins/query-logger.ts` — Drizzle-compatible logger that integrates with pino, warns on slow queries (>500ms)
  - Implement: Update `apps/api/src/plugins/database.ts` to pass query logger to Drizzle initialization
  - Implement: Add `.max(100)` to search field in `shared/schemas/mutuals.ts` `getMutualsQuerySchema`
  - Implement: Review and add `.max()` constraints to all other unbounded query string params across shared schemas
  - Test: Write unit tests for query logger — logs at debug level, warns on slow queries
  - Test: Verify search length validation rejects strings > 100 chars
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 2.3: Add response schemas to remaining routes and OpenAPI/Swagger integration
  - Implement: Add Zod response schemas for `DELETE /trips/:tripId/members/:memberId` in `invitation.routes.ts`
  - Implement: Add Zod response schemas for `GET /mutuals` and `GET /trips/:tripId/mutual-suggestions` in `mutuals.routes.ts`
  - Implement: Install `@fastify/swagger` and `@fastify/swagger-ui` packages
  - Implement: Create `apps/api/src/plugins/swagger.ts` — configure OpenAPI spec with Zod type provider transform, security schemes, API info
  - Implement: Register swagger plugin in `apps/api/src/app.ts` before routes (non-production only or env-controlled)
  - Test: Write integration test — verify `/docs` endpoint returns OpenAPI UI
  - Test: Write integration test — verify `/docs/json` returns valid OpenAPI spec with all routes
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 2.4: Fix all bare select() calls across services (20+ occurrences)
  - Implement: Add explicit column selection to `auth.service.ts` (lines 83, 117) — select only id, phoneNumber, displayName, createdAt
  - Implement: Add column selection to `trip.service.ts` (lines 236, 336, 443, 465, 707, 726, 817, 833) — select per query context
  - Implement: Add column selection to `invitation.service.ts` (lines 533, 595, 906, 992)
  - Implement: Add column selection to `accommodation.service.ts` (lines 211, 279, 420)
  - Implement: Add column selection to `event.service.ts` (line 208)
  - Implement: Add column selection to `member-travel.service.ts` (lines 242, 439)
  - Test: Verify all existing tests still pass (no missing fields in responses)
  - Verify: run full test suite, lint, and typecheck pass

## Phase 3: Cursor Pagination

- [ ] Task 3.1: Convert backend OFFSET pagination to cursor-based (trips, notifications, messages)
  - Implement: Create `apps/api/src/utils/pagination.ts` with `encodeCursor` and `decodeCursor` utilities (base64url JSON with sort key + id)
  - Implement: Convert `trip.service.ts` (line 451) from OFFSET to cursor pagination keyed on `(createdAt DESC, id)`
  - Implement: Convert `notification.service.ts` (line 166) from OFFSET to cursor pagination
  - Implement: Convert `message.service.ts` (line 185) from OFFSET to cursor pagination
  - Implement: Update shared schemas in `shared/schemas/trip.ts`, `notification.ts`, `message.ts` — replace page/offset params with cursor/limit, response includes nextCursor
  - Test: Write unit tests for encodeCursor/decodeCursor — round-trip, malformed cursor returns 400
  - Test: Update existing integration tests for all 3 endpoints to use cursor-based params
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 3.2: Update frontend consumers for cursor pagination (trips, notifications, messages)
  - Implement: Update `apps/web/src/hooks/trip-queries.ts` — convert trips list to useInfiniteQuery with getNextPageParam extracting nextCursor
  - Implement: Update `apps/web/src/hooks/notification-queries.ts` — update cursor param handling
  - Implement: Update `apps/web/src/hooks/message-queries.ts` — update cursor param handling
  - Implement: Update consuming components (trips-content.tsx, notification components, message components) to use `data.pages.flatMap(p => p.items)` pattern
  - Implement: Add `placeholderData: keepPreviousData` to paginated queries
  - Test: Update existing component tests for new pagination shape
  - Verify: run full test suite, lint, and typecheck pass

## Phase 4: Frontend Data Layer

- [ ] Task 4.1: TanStack Query improvements (enabled, useMutationState, select, QueryErrorResetBoundary)
  - Implement: Remove `enabled` from all 19 query factory call sites across 8 files (`trip-queries.ts`, `accommodation-queries.ts`, `invitation-queries.ts`, `member-travel-queries.ts`, `message-queries.ts`, `event-queries.ts`, `mutuals-queries.ts`, `notification-queries.ts`)
  - Implement: Add `enabled: !!id` at each corresponding `useQuery()` call site in `use-*.ts` hook files
  - Implement: Create `apps/web/src/components/global-mutation-indicator.tsx` using `useMutationState` — thin progress bar when mutations pending
  - Implement: Add `GlobalMutationIndicator` to `apps/web/src/app/(app)/layout.tsx`
  - Implement: Add `select` option in 3-5 components that only need subset of query data
  - Implement: Wrap app content with `QueryErrorResetBoundary` in layout, update `ErrorBoundary` to accept `onReset` prop
  - Test: Write component test for GlobalMutationIndicator — visible during pending mutation, hidden when idle
  - Test: Verify existing query tests pass with enabled moved to call sites
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 4.2: Fix React patterns and React Hook Form invitation schema
  - Implement: Fix useEffect deps in `apps/web/src/app/(app)/trips/trips-content.tsx` (lines 48-65) — remove router, searchParams, pathname from deps
  - Implement: Extract SkeletonCard to module level in `trips-content.tsx` (lines 13-37)
  - Implement: Move endDate auto-fill from useEffect to onChange handler in `apps/web/src/components/trip/create-trip-dialog.tsx` (lines 79-83)
  - Implement: Parallelize data fetching in `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — remove sequential enabled guards
  - Implement: Add `path: ["phoneNumbers"]` to refinement in `shared/schemas/invitation.ts`
  - Test: Update shared invitation schema tests to verify error path
  - Verify: run full test suite, lint, and typecheck pass

## Phase 5: UI Component Fixes

- [ ] Task 5.1: Fix shadcn/ui token violations and WCAG AA color contrast
  - Implement: Replace hardcoded amber colors with `warning` theme tokens in `apps/web/src/components/ui/rsvp-badge.tsx` (defaultStyles and overlayStyles)
  - Implement: Replace raw `<button>` with `<Button>` component in `apps/web/src/components/error-boundary.tsx`, add `onReset` prop support
  - Implement: Fix inline link classes in `apps/web/src/components/mutuals/mutual-profile-sheet.tsx` (line 71) — use `cn()` utility
  - Implement: Darken `--color-muted-foreground` in `apps/web/src/app/globals.css` from `#6b6054` to pass 4.5:1 WCAG AA against `#fbf6ef`
  - Test: Update RsvpBadge tests to verify theme token classes
  - Test: Verify ErrorBoundary renders Button component with correct variant
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 5.2: Add missing Next.js loading states, timezone expansion, and decorative alt text
  - Implement: Create `apps/web/src/app/(app)/mutuals/loading.tsx` with skeleton matching mutuals page layout
  - Implement: Create `apps/web/src/app/(auth)/loading.tsx` with skeleton for auth pages
  - Implement: Expand timezone options beyond 6 US entries to include major international timezones
  - Implement: Find decorative images and ensure they have `alt=""` (empty alt for decorative)
  - Test: Verify loading.tsx files render without errors
  - Verify: run full test suite, lint, and typecheck pass

## Phase 6: Design System Refresh

- [ ] Task 6.1: Add Space Grotesk accent font and apply across UI
  - Implement: Add `Space_Grotesk` import in `apps/web/src/app/layout.tsx` via `next/font/google` with weights 400-700
  - Implement: Add `--font-accent` CSS variable to `@theme` in `apps/web/src/app/globals.css`
  - Implement: Apply `font-accent` to navigation labels in app header, badge/tag text, hero numbers, primary CTA button labels, section subheadings, empty state headings
  - Implement: Increase decorative element opacity from 0.04 to 0.08-0.12
  - Test: Verify font loads correctly (no layout shift, correct font-display)
  - Verify: run full test suite, lint, and typecheck pass
  - Verify: manual testing with screenshots — font rendering across key pages

- [ ] Task 6.2: Add scroll-triggered animations, staggered reveals, and page transitions
  - Implement: Create `apps/web/src/hooks/use-scroll-reveal.ts` — IntersectionObserver hook with one-shot reveal
  - Implement: Add `revealUp`, `revealScale`, `staggerIn` keyframes to `apps/web/src/app/globals.css`
  - Implement: Apply scroll-reveal to card grids (trips, mutuals, events) with staggered `animation-delay` based on index
  - Implement: Add page-level reveal animations to main content containers with staggered delays
  - Implement: Use `motion-safe:` prefix on all animations to respect prefers-reduced-motion
  - Test: Verify animations don't break layout or cause CLS
  - Verify: run full test suite, lint, and typecheck pass
  - Verify: manual testing with screenshots — animation behavior on trips page, mutuals page

- [ ] Task 6.3: Add gradient mesh backgrounds, textures, asymmetric layouts, and card effects
  - Implement: Add `.gradient-mesh` CSS class to `globals.css` — multi-layer radial gradients using primary/accent/success colors
  - Implement: Apply gradient mesh to page containers (trips list, mutuals, auth pages)
  - Implement: Add subtle noise texture overlay (CSS pseudo-element, ~3% opacity) to card backgrounds
  - Implement: Create asymmetric trips grid layout (featured trip spanning 2 rows) for desktop with CSS Grid
  - Implement: Add card hover lift effect (`translateY(-4px)` + enhanced shadow) and active press feedback (`scale-[0.98]`) to TripCard, EventCard
  - Implement: Add topographic line pattern SVG as decorative background on empty states
  - Test: Verify gradient mesh renders correctly across browsers
  - Verify: run full test suite, lint, and typecheck pass
  - Verify: manual testing with screenshots — visual refresh on key pages, hover effects, empty states

## Phase 7: Mobile UX

- [ ] Task 7.1: Create responsive dialog system and convert all dialogs
  - Implement: Create `apps/web/src/hooks/use-media-query.ts` — SSR-safe media query hook
  - Implement: Create `apps/web/src/components/ui/responsive-dialog.tsx` — switches between Dialog (desktop ≥768px) and Sheet side="bottom" (mobile)
  - Implement: Export ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter
  - Implement: Convert 12 dialog components to use ResponsiveDialog: create-trip, edit-trip, invite-members, create/edit event, create/edit accommodation, create/edit member-travel, deleted-items, trip-notification, profile
  - Test: Write component tests for ResponsiveDialog — renders Dialog on desktop, Sheet on mobile
  - Test: Verify at least 2 converted dialogs render correctly in both modes
  - Verify: run full test suite, lint, and typecheck pass
  - Verify: manual testing with screenshots — dialog on desktop vs bottom-sheet on mobile viewport

- [ ] Task 7.2: Add responsive hamburger menu and fix hover-dependent interactions
  - Implement: Create `apps/web/src/components/mobile-nav.tsx` — Sheet side="left" with user info, navigation links (Trips, Mutuals), profile, logout
  - Implement: Update `apps/web/src/components/app-header.tsx` — show hamburger + brand + notification on mobile (<md), current layout on desktop (≥md)
  - Implement: Add `@media (hover: hover)` guards around hover-dependent preload interactions (onMouseEnter on trip cards, dialog triggers)
  - Implement: For touch devices, use onFocus or onTouchStart for preloading instead
  - Test: Write component tests for mobile-nav — renders navigation links, opens/closes correctly
  - Test: Write component tests for app-header — hamburger visible on mobile, hidden on desktop
  - Verify: run full test suite, lint, and typecheck pass
  - Verify: manual testing with screenshots — mobile nav at 375px viewport, desktop nav at 1280px

## Phase 8: Testing Infrastructure

- [ ] Task 8.1: Add Firefox, WebKit, and mobile viewport Playwright projects
  - Implement: Update `apps/web/playwright.config.ts` — add firefox, webkit, iPhone 14, iPad Mini projects
  - Implement: Ensure Playwright browsers are installed in devcontainer (Firefox + WebKit)
  - Test: Run a subset of E2E tests (auth-journey) across all 5 projects to verify they pass
  - Verify: all E2E projects launch and pass at least auth journey

- [ ] Task 8.2: Replace hard-coded E2E timeouts with named constants
  - Implement: Add new timeout constants to `apps/web/tests/e2e/helpers/timeouts.ts` as needed (e.g., `INTERACTION_TIMEOUT`, `FORM_TIMEOUT`)
  - Implement: Replace ~28 inline timeout numbers in `trip-journey.spec.ts` with named constants
  - Implement: Replace ~10 inline timeouts in `profile-journey.spec.ts`
  - Implement: Replace ~12 inline timeouts in `invitation-journey.spec.ts`
  - Implement: Replace ~12 inline timeouts in `itinerary-journey.spec.ts`
  - Implement: Replace inline timeouts in helpers (itinerary.ts, trips.page.ts, profile.page.ts, trips.ts)
  - Test: Run full E2E suite — all tests pass with named constants
  - Verify: run full test suite including E2E, lint, and typecheck pass

## Phase 9: Cleanup

- [ ] Task 9.1: Triage PROGRESS.md for unaddressed items
  - Review: Read entire PROGRESS.md
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items across ALL phases
  - Fix: Create individual fix tasks in TASKS.md for each outstanding issue
  - Verify: run full test suite

## Phase 10: Final Verification

- [ ] Task 10.1: Full regression check
  - Verify: all unit tests pass (`pnpm test`)
  - Verify: all integration tests pass
  - Verify: all E2E tests pass across all browser projects (`pnpm test:e2e`)
  - Verify: linting passes (`pnpm lint`)
  - Verify: type checking passes (`pnpm typecheck`)
  - Verify: manual testing — security features (logout invalidates token, lockout works), design refresh (fonts, animations, gradients), mobile UX (hamburger menu, bottom-sheet dialogs)
