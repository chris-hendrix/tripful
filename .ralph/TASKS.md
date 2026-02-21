# Tasks: Skill Audit Fixes

## Phase 1: Quick Wins & Critical Fixes

- [x] Task 1.1: Add viewport export, mobile meta, noscript, page metadata, and hidePoweredBy
  - Implement: In `apps/web/src/app/layout.tsx` — add `export const viewport: Viewport` with `width: "device-width"`, `initialScale: 1`, `maximumScale: 5`, `themeColor: "#1a1814"`
  - Implement: In `apps/web/src/app/layout.tsx` — extend `metadata` export with `appleWebApp: { capable: true, statusBarStyle: "default", title: "Tripful" }`
  - Implement: In `apps/web/src/app/layout.tsx` body — add `<noscript>` block with "JavaScript required" message
  - Implement: Add `export const metadata` to `apps/web/src/app/verify/page.tsx` (`{ title: "Verify" }`) and complete-profile page (`{ title: "Complete Profile" }`)
  - Implement: In `apps/api/src/app.ts` helmet config — add `hidePoweredBy: true`
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 1.2: Remove phone from JWT payload and add cache-control headers
  - Implement: In `apps/api/src/services/auth.service.ts:333-337` — remove `phone: user.phoneNumber` from JWT payload
  - Implement: In `apps/api/src/types/index.ts` — remove `phone: string` from `JWTPayload` interface
  - Implement: Update auth middleware comment that mentions phone in JWT payload
  - Implement: Remove `phone` from any test fixtures/mocks that include it in JWT payloads
  - Implement: Add `Cache-Control: no-store` and `Pragma: no-cache` headers on auth route responses
  - Test: Verify existing auth tests pass with updated JWT shape
  - Test: `pnpm typecheck` catches any remaining phone references
  - Verify: run full test suite

- [x] Task 1.3: Fix mutedBy schema reference, pg-boss retention, and review redundant index
  - Implement: In `apps/api/src/db/schema/index.ts` (~line 503) — add `{ onDelete: "cascade" }` to `mutedBy` `.references()` call
  - Implement: Generate and apply migration: `cd apps/api && pnpm db:generate && pnpm db:migrate`
  - Implement: Add retention/cleanup config to DAILY_ITINERARIES pg-boss cron job to prevent row accumulation
  - Implement: Review `tripIdIsOrganizerIdx` on members table — verify if it's redundant given FK index on `tripId`, remove if unnecessary
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 1.4: Fix global error handler to display error message
  - Implement: In `apps/web/src/app/global-error.tsx` — extract `error` from destructuring, display `error.message` in the UI
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 1.5: Phase 1 cleanup
  - Review: Read PROGRESS.md entries for Phase 1 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 2: Component Library Standardization

- [x] Task 2.1: Standardize Radix UI imports to unified "radix-ui" package
  - Implement: In `ui/select.tsx` — change `import * as SelectPrimitive from "@radix-ui/react-select"` to `import { Select as SelectPrimitive } from "radix-ui"`, update subcomponent references
  - Implement: In `ui/label.tsx` — change `import * as LabelPrimitive from "@radix-ui/react-label"` to `import { Label as LabelPrimitive } from "radix-ui"`, update subcomponent references
  - Implement: In `ui/badge.tsx` — change `import { Slot } from "@radix-ui/react-slot"` to `import { Slot } from "radix-ui"`, change `Slot` → `Slot.Root` in component
  - Implement: In `ui/form.tsx` — change `import type * as LabelPrimitive from "@radix-ui/react-label"` and `import { Slot } from "@radix-ui/react-slot"` to `import { Label as LabelPrimitive, Slot } from "radix-ui"`, change `Slot` → `Slot.Root`
  - Implement: In `ui/sheet.tsx` — change `import * as DialogPrimitive from "@radix-ui/react-dialog"` to `import { Dialog as DialogPrimitive } from "radix-ui"`, update subcomponent references
  - Implement: In `ui/dialog.tsx` — change `import * as DialogPrimitive from "@radix-ui/react-dialog"` to `import { Dialog as DialogPrimitive } from "radix-ui"`, update subcomponent references
  - Test: `pnpm typecheck` passes — all component types resolve
  - Test: `pnpm dev:web` — verify components render correctly (spot check dialogs, selects, badges, forms)
  - Verify: run full test suite

- [x] Task 2.2: Fix focus styling, add "use client" directives, and refactor Select to CVA
  - Implement: Search all `components/ui/` files for `focus:ring` and `focus:outline` — replace with `focus-visible:ring` / `focus-visible:outline`
  - Implement: Unify focus ring width and color between dialog/sheet and button/input components
  - Implement: Add `"use client"` directive to top of `button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`
  - Implement: Refactor Select component's size handling to use `cva` variant pattern (matching Button's approach)
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 2.3: Phase 2 cleanup
  - Review: Read PROGRESS.md entries for Phase 2 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 3: Form & Data Layer

- [x] Task 3.1: Fix timezone select, duplicate key pattern, and add server error mapping
  - Implement: In `components/itinerary/create-event-dialog.tsx` — replace timezone `useState` + bare `FormItem` with `FormField` wrapping the Select, ensure `timezone` is in the Zod schema, remove `selectedTimezone` state
  - Implement: In `edit-event-dialog.tsx:543` — replace composite key with `field.id` from `useFieldArray`
  - Implement: Create `apps/web/src/lib/form-errors.ts` with `mapServerErrors<T>()` utility that maps API error codes to form fields via `setError()`
  - Implement: Update form dialogs (create-trip, edit-trip, create-event, edit-event) to use `mapServerErrors()` in `onError`, falling back to toast for unmapped errors
  - Test: Write unit tests for `mapServerErrors` utility
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 3.2: Fix TanStack Query mutation error types and verify callback signatures
  - Implement: Add explicit `APIError` type parameter to all mutation hooks: `useMutation<ResponseType, APIError, InputType>({...})`
  - Implement: Review and fix callback signatures in `use-trips.ts`, `use-events.ts`, `use-accommodations.ts`, `use-member-travel.ts` to use complete v5 parameter lists
  - Test: `pnpm typecheck` passes with stricter error types
  - Verify: run full test suite

- [x] Task 3.3: Fix notification bell animation, conditional rendering, and memoization
  - Implement: In `notification-bell.tsx` — fix animation re-trigger by using React `key={displayCount}` technique instead of broken useRef+useEffect class manipulation
  - Implement: Remove the `useRef` + `useEffect` + `classList` approach, remove redundant static animation class from JSX
  - Implement: Change `{displayCount && <span>...` to `{displayCount ? <span>... : null}` to prevent falsy value rendering
  - Implement: Apply `useMemo` to derived state if computation warrants it
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 3.4: Remove unnecessary useCallback in itinerary views
  - Implement: In `itinerary/group-by-type-view.tsx:82-93` — remove `useCallback` wrappers around trivial state setters that have no complex dependencies
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 3.5: Phase 3 cleanup
  - Review: Read PROGRESS.md entries for Phase 3 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 4: API Backend

- [x] Task 4.1: Optimize N+1 query, existence checks, and sequential count queries
  - Implement: In `services/trip.service.ts:349-366` — replace 2 sequential queries with single query using Drizzle `with`/join for `getTripById()`
  - Implement: In `services/event.service.ts:140-144` and similar locations — replace `SELECT *` for existence checks with `SELECT id ... LIMIT 1`
  - Implement: In `services/notification.service.ts:133-147` — combine total and unread count queries into single query with conditional aggregation
  - Test: Write/update integration tests to verify optimized queries return same results
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 4.2: Fix 405 handling, hook ordering, plugin metadata, and AJV useDefaults
  - Implement: In `apps/api/src/app.ts:202-211` — verify Fastify handles 405 natively for registered routes, improve not-found handler error message to include method info
  - Implement: In `routes/trip.routes.ts:99-101` and similar — reorder `preHandler` to put rate limiting before authentication
  - Implement: Add `fastify-plugin` metadata (`fastify: "5.x"`, `name`) to service plugins that lack it
  - Implement: Add `useDefaults: true` to AJV compiler options if not already configured
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 4.3: Add Next.js auth middleware for SSR protection
  - Implement: Create `apps/web/src/middleware.ts` — check for auth token cookie on protected routes (`/trips/*`, `/settings/*`), redirect to `/` if missing
  - Implement: Configure `matcher` to cover all protected route patterns
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 4.4: Phase 4 cleanup
  - Review: Read PROGRESS.md entries for Phase 4 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 5: Accessibility

- [x] Task 5.1: Add aria-live, aria-required, aria-describedby, and autocomplete attributes
  - Implement: Add `aria-live="polite"` to notification count badge, form validation error containers, and loading→content transition areas
  - Implement: Verify if sonner toast library already handles `aria-live` — if not, add to toast container
  - Implement: Add `aria-required="true"` to required form inputs (check if shadcn FormItem handles this automatically via the field)
  - Implement: In `create-trip-dialog.tsx:526` and similar — link error messages to inputs via `aria-describedby`
  - Implement: Add `autoComplete` attributes: phone inputs (`"tel"`), name inputs (`"name"`), display name (`"nickname"`)
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 5.2: Fix color contrast and add URL state persistence
  - Implement: Darken `--color-muted-foreground` from `#8c8173` to a WCAG AA compliant value (≥4.5:1 ratio), maintaining warm tone
  - Implement: Where search functionality exists — persist query in URL using `useSearchParams` and `router.replace()`
  - Implement: Evaluate if dialog URL state adds value — implement for key dialogs (create-trip) if beneficial
  - Test: Verify contrast ratio with contrast checker tool
  - Test: `pnpm typecheck` passes
  - Verify: run full test suite

- [x] Task 5.3: Phase 5 cleanup
  - Review: Read PROGRESS.md entries for Phase 5 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 6: E2E Test Modernization

- [x] Task 6.1: Refactor auth helpers and login page to role-based locators
  - Implement: In `tests/e2e/helpers/auth.ts` — replace all CSS selectors (`input[type="tel"]`, `button:has-text()`, etc.) with role-based locators (`getByRole`, `getByLabel`)
  - Implement: In `tests/e2e/helpers/pages/login.page.ts` — fix `.first()` on `codeInput` with a specific locator, verify all other locators use role-based patterns
  - Test: Run E2E tests that use auth helpers — all must pass with new locators
  - Verify: `pnpm test:e2e` passes

- [x] Task 6.2: Refactor page objects, fix auto-wait patterns, and remove page.evaluate DOM manipulation
  - Implement: In `tests/e2e/helpers/pages/trip-detail.page.ts` — replace CSS selectors (`input[name="..."]`, `textarea[name="..."]`) with `getByLabel()` or `getByRole()`
  - Implement: Across all spec files — replace `.textContent()` polling loops with `await expect(el).toHaveText()`, `.isVisible()` checks with `await expect(el).toBeVisible()`
  - Implement: Replace `page.evaluate()` DOM manipulation (e.g., toast removal via `document.querySelectorAll`) with Playwright's built-in waiting/interaction methods
  - Implement: Fix `dispatchEvent("mouseleave")` workarounds with proper Playwright hover/unhover patterns
  - Test: Run affected E2E tests
  - Verify: `pnpm test:e2e` passes

- [x] Task 6.3: Consolidate helpers, add expect.soft(), and fix broad .or() locators
  - Implement: Move inline helper functions from spec files to shared helper files in `tests/e2e/helpers/`
  - Implement: Identify non-critical assertions and convert to `expect.soft()` where failure shouldn't abort the test
  - Implement: Replace overly broad `.or()` locator chains with more specific single locators
  - Implement: Ensure page object pattern is consistent across all page objects
  - Test: Run full E2E suite
  - Verify: `pnpm test:e2e` passes

- [x] Task 6.4: Phase 6 cleanup
  - Review: Read PROGRESS.md entries for Phase 6 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

- [x] Task 6.4.1 FIX: Convert remaining CSS selectors and .first()/.last() patterns in E2E spec files to role-based locators
  - Implement: In `itinerary-journey.spec.ts` — replace ~22 CSS selectors (`input[name="..."]`, `textarea[name="..."]`, `button[title="..."]`, `[role="button"][aria-expanded]`, `[title="..."]`) with `getByLabel()`, `getByRole()`, `getByTitle()` equivalents
  - Implement: In `trip-journey.spec.ts` — replace ~4 CSS selectors with role-based locators
  - Implement: In `invitation-journey.spec.ts` — replace CSS selectors (`input[type="tel"]`, `[data-testid="..."]`, `#id-selectors`) with role-based locators
  - Implement: In `helpers/itinerary.ts` — replace `button[role="combobox"]` with `getByRole("combobox")`, `div[role="option"]` with `getByRole("option")`, `input[name="location"]` with `getByLabel()`
  - Implement: In `helpers/date-pickers.ts` — replace CSS selectors (`[role="gridcell"]`, `data-slot`, `data-outside`) with role-based locators where feasible
  - Implement: In remaining spec files — replace bare tag selectors (`.locator("button")`, `.locator("span")`, `.locator("p")`, `.locator("div")`) with role-based or scoped locators
  - Implement: Reduce `.first()` / `.last()` on generic locators by scoping to parent elements or using more specific accessible names
  - Test: `pnpm test:e2e` passes

## Phase 7: Mobile & Responsive

- [x] Task 7.1: Fix touch targets, input heights, and checkbox/radio hit areas
  - Implement: In `button.tsx` — fix `h-11 sm:h-9` pattern so touch targets stay ≥44px on all screen sizes (or ensure tap area with min-h)
  - Implement: In `input.tsx` — fix height scaling that shrinks from 44px to 36px on `sm:` breakpoint
  - Implement: In `checkbox.tsx:17` — add padding around 16px visual to create ≥44px touch area
  - Implement: In `radio-group.tsx:30` — add padding around visual to create ≥44px touch area
  - Test: `pnpm typecheck` passes
  - Test: Manual check at mobile viewport — verify touch targets
  - Verify: run full test suite

- [ ] Task 7.2: Fix mobile-first CSS patterns, FAB padding, and SM breakpoint inconsistencies
  - Implement: Audit and fix inverse mobile-first patterns (`h-11 sm:h-9` → proper mobile-first) across components
  - Implement: Ensure FAB (floating action button) has sufficient bottom padding to clear mobile browser navigation (80-100px or safe area insets)
  - Implement: Audit all `sm:` breakpoint overrides for consistency — ensure no conflicting size changes
  - Test: `pnpm typecheck` passes
  - Test: Manual check at multiple viewport widths
  - Verify: run full test suite

- [ ] Task 7.3: Phase 7 cleanup
  - Review: Read PROGRESS.md entries for Phase 7 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 8: Frontend Design & Typography

- [ ] Task 8.1: Replace DM Sans with Plus Jakarta Sans
  - Implement: In `apps/web/src/lib/fonts.ts` — replace `DM_Sans` import with `Plus_Jakarta_Sans`, update variable name to `--font-plus-jakarta`
  - Implement: In `apps/web/src/app/globals.css` — update `--font-sans: var(--font-plus-jakarta)` in @theme block
  - Implement: In `apps/web/src/app/layout.tsx` — update font variable class from `dmSans.variable` to `plusJakartaSans.variable`
  - Test: `pnpm typecheck` passes
  - Test: `pnpm dev:web` — verify font renders correctly across pages
  - Verify: run full test suite

- [ ] Task 8.2: Add page transitions, staggered list reveals, and micro-interactions
  - Implement: In `globals.css` — add `fadeIn` and `slideUp` keyframes
  - Implement: Apply `fadeIn` animation to page-level content wrappers for smooth page transitions
  - Implement: Apply staggered `slideUp` animation to list items (trip cards, member lists, event lists) with incremental `animation-delay`
  - Implement: Add `active:scale-[0.97] transition-transform` to button component variants
  - Implement: Add `hover:-translate-y-0.5 hover:shadow-md transition-all` to interactive card components
  - Test: `pnpm typecheck` passes
  - Test: Manual check — verify animations play smoothly, respect `prefers-reduced-motion`
  - Verify: run full test suite

- [ ] Task 8.3: Improve button/input/card styling, background atmosphere, and skeleton loaders
  - Implement: Enhance button styling — add subtle shadow to primary variant, refine border-radius
  - Implement: Enhance input styling — add focus transitions, subtle inner shadow, consider rounded-xl
  - Implement: Add subtle gradient or tonal background to page layouts for depth
  - Implement: Review and improve color distribution — ensure accent color is used sparingly for CTAs
  - Implement: Replace generic skeleton loaders with component-shaped skeletons matching content they replace
  - Test: `pnpm typecheck` passes
  - Test: Manual visual check — verify improvements look cohesive
  - Verify: run full test suite

- [ ] Task 8.4: Phase 8 cleanup
  - Review: Read PROGRESS.md entries for Phase 8 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 9: Final Verification

- [ ] Task 9.1: Full regression check
  - Verify: `pnpm lint` — 0 errors
  - Verify: `pnpm typecheck` — all packages compile with 0 errors
  - Verify: `pnpm test` — all unit and integration tests pass
  - Verify: `pnpm test:e2e` — all E2E tests pass
