# Tasks: Frontend Design Overhaul

## Phase 1: Design Foundation

- [x] Task 1.1: Set up design token system, fonts, and gradient button variant
  - Implement: Update `apps/web/src/app/globals.css` — replace entire `@theme` block with Vivid Capri palette (primary, accent, background, foreground, card, muted, border, input, ring, secondary, destructive, popover, plus new success/warning tokens). Remove dark mode CSS variables under `:root[class~="dark"]`.
  - Implement: Update `apps/web/src/lib/fonts.ts` — add DM Sans font with `--font-dm-sans` CSS variable alongside existing Playfair Display.
  - Implement: Update `apps/web/src/app/layout.tsx` — add both font variables to `<html>` className, add `suppressHydrationWarning`.
  - Implement: Add `--font-sans: var(--font-dm-sans)` to the `@theme` block in globals.css so DM Sans becomes the default body font.
  - Implement: Update `apps/web/src/components/ui/button.tsx` — add `gradient` variant to `buttonVariants` CVA definition using `from-primary to-accent` with proper hover/shadow states.
  - Test: Verify fonts load correctly (check network tab for font files), DM Sans renders as body font, Playfair Display still works for display headings.
  - Test: Run `pnpm typecheck` and `pnpm lint` in apps/web.
  - Verify: Run full test suite (`pnpm test` from repo root). Fix any test failures caused by CSS class changes.

## Phase 2: App Shell & Navigation

- [x] Task 2.1: Build app shell with header, navigation, skip link, and main landmark
  - Implement: Install shadcn components — `pnpm dlx shadcn@latest add dropdown-menu avatar separator tooltip` (run from apps/web).
  - Implement: Create `apps/web/src/components/skip-link.tsx` — a skip-to-content link (`<a href="#main-content">`) that is `sr-only` by default and visible on focus. Style with the new brand palette.
  - Implement: Create `apps/web/src/components/app-header.tsx` — client component with: Tripful wordmark/text in Playfair Display linking to `/dashboard`, a "Dashboard" nav link with active state (using `usePathname()`), and a user avatar dropdown menu (using shadcn DropdownMenu + Avatar) with "Profile" and "Log out" items. Use `useAuth()` for user data and logout. Wrap in `<header>` with `<nav aria-label="Main navigation">`.
  - Implement: Update `apps/web/src/app/(app)/layout.tsx` — import AppHeader (client component) and SkipLink. Wrap children in `<main id="main-content">`. Render SkipLink before header, then AppHeader, then main.
  - Implement: Update `apps/web/src/app/layout.tsx` — add SkipLink as first child of `<body>` (for auth pages too).
  - Implement: Update `apps/web/src/app/(auth)/layout.tsx` — wrap content in `<main id="main-content">`.
  - Test: Write unit test for AppHeader — renders wordmark, nav links, user menu. Test logout triggers auth logout.
  - Test: Write E2E test (Playwright) — verify header is visible on dashboard, user menu opens, logout works.
  - Test: Verify skip link is visible on Tab key press and jumps focus to main content.
  - Verify: Run full test suite. Fix any test failures from layout changes.

## Phase 3: Design Token Migration

- [x] Task 3.1: Migrate all hardcoded colors to design tokens across the entire app
  - Implement: Update `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` — replace all `slate-*`, `gray-*`, `blue-*`, `red-*` hardcoded colors with design tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `border-border`, `text-destructive`, etc.). Replace gradient button class strings with `<Button variant="gradient">`. Replace raw `<button>` FAB with `<Button variant="gradient" size="icon">`. Replace hand-written SkeletonCard with shadcn Skeleton if installed, or convert to use token colors. Add `aria-live="polite"` to the trip list container.
  - Implement: Update `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — replace all hardcoded colors with design tokens. Replace gradient button class strings with `<Button variant="gradient">`.
  - Implement: Update `apps/web/src/components/trip/trip-card.tsx` — replace hardcoded colors with tokens. Convert `<div role="button" tabIndex={0} onClick>` to Next.js `<Link href={/trips/${trip.id}}>`. Remove manual `onKeyDown` handler. Keep hover/active animations.
  - Implement: Update `apps/web/src/components/trip/create-trip-dialog.tsx` — replace hardcoded colors with tokens. Replace gradient button strings with `<Button variant="gradient">`. Replace native `<input type="checkbox">` with shadcn `<Checkbox>`. Increase co-organizer remove button touch target to min 44x44px.
  - Implement: Update `apps/web/src/components/trip/edit-trip-dialog.tsx` — replace hardcoded colors with tokens. Replace gradient button strings with `<Button variant="gradient">`. Replace native checkbox with shadcn `<Checkbox>`. Install AlertDialog (`pnpm dlx shadcn@latest add alert-dialog`) and replace inline delete confirmation with `<AlertDialog>`. Increase co-organizer remove button touch target.
  - Implement: Update `apps/web/src/components/trip/image-upload.tsx` — replace hardcoded colors with tokens. Replace raw `<button>` elements with shadcn `<Button>`. Increase remove/retry button touch targets to min 44x44px.
  - Implement: Update `apps/web/src/app/(auth)/login/page.tsx` — replace hardcoded colors with tokens. Change `<h2>` to `<h1>`. Add `autocomplete="tel"` to phone input. Add `aria-required="true"` to required fields. Replace gradient button with `<Button variant="gradient">`.
  - Implement: Update `apps/web/src/app/(auth)/verify/page.tsx` — replace hardcoded colors with tokens. Change `<h2>` to `<h1>`. Replace gradient button with `<Button variant="gradient">`. Fix focus styles to use `focus-visible:` consistently.
  - Implement: Update `apps/web/src/app/(auth)/complete-profile/page.tsx` — replace hardcoded colors with tokens. Change `<h2>` to `<h1>`. Add `autocomplete="name"` to name input. Add `aria-required="true"`. Replace gradient button with `<Button variant="gradient">`.
  - Test: Run `pnpm typecheck` and `pnpm lint`.
  - Test: Update existing component tests that assert on specific class names, heading levels (h2→h1), or markup structure (TripCard div→Link).
  - Verify: Run full test suite. All existing tests must pass with updated assertions.

## Phase 4: Toast Notifications & Breadcrumbs

- [x] Task 4.1: Add Sonner toast system, breadcrumbs, and replace inline notifications
  - Implement: Install Sonner — `pnpm dlx shadcn@latest add sonner` (from apps/web).
  - Implement: Install Breadcrumb — `pnpm dlx shadcn@latest add breadcrumb` (from apps/web).
  - Implement: Install Skeleton — `pnpm dlx shadcn@latest add skeleton` (from apps/web).
  - Implement: Add `<Toaster />` from Sonner to `apps/web/src/app/layout.tsx` (or providers.tsx) so toasts work app-wide.
  - Implement: Update `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — replace the success banner (useState + setTimeout pattern) with `toast.success("Trip updated successfully")` from Sonner. Add `<Breadcrumb>` above the trip title with "My Trips" link → current trip name.
  - Implement: Update `apps/web/src/components/trip/create-trip-dialog.tsx` — replace inline error div with `toast.error()` for API errors.
  - Implement: Update `apps/web/src/components/trip/edit-trip-dialog.tsx` — replace inline error div with `toast.error()` for API errors. Add `toast.success()` for successful deletion.
  - Implement: Update `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` — replace hand-built SkeletonCard with shadcn `<Skeleton>` component for consistent skeleton loading states.
  - Test: Verify toast notifications appear on trip create error, edit error, edit success, delete success.
  - Test: Verify breadcrumbs render on trip detail page and "My Trips" links back to dashboard.
  - Test: Update any existing tests that reference the removed success banner or inline error elements.
  - Verify: Run full test suite.

## Phase 5: Visual Design & Layout

- [x] Task 5.1: Redesign auth layout, landing page, and dashboard grid layout
  - Implement: Redesign `apps/web/src/app/(auth)/layout.tsx` — replace dark gradient + animate-pulse orbs with travel-poster-inspired layout. Use warm cream background, subtle geometric pattern or compass-rose SVG decoration, Tripful wordmark above auth card. Keep `<main>` landmark.
  - Implement: Redesign `apps/web/src/app/page.tsx` — create a simple branded landing page with travel poster aesthetic. Include Tripful wordmark in Playfair Display, tagline "Plan and share your adventures", and a CTA button to `/login`. Use the warm cream background with azure/terracotta accent.
  - Implement: Update `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` — change trip list from `space-y-4` vertical stack to responsive grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Adjust TripCard to work well in a grid layout (taller cover images for magazine-style feel).
  - Implement: Update `apps/web/src/components/trip/trip-card.tsx` — increase cover image height for magazine-style presentation. Update placeholder gradient to use brand accent colors. Ensure cards look good at varying widths in the grid.
  - Implement: Update trip card placeholder (no cover image) to use a travel-poster-inspired pattern or warm gradient instead of `from-slate-100 to-blue-100`.
  - Implement: Adjust FAB position for mobile safety — add `bottom-safe` offset or increase bottom margin on small screens.
  - Test: Verify responsive grid renders correctly at mobile (1 col), tablet (2 col), and desktop (3 col) breakpoints.
  - Test: Verify auth pages render with new design, forms still work.
  - Test: Verify landing page renders with brand elements and CTA navigates to login.
  - Test: E2E screenshot tests of landing, auth, dashboard, and trip detail at multiple viewports.
  - Verify: Run full test suite.

## Phase 6: Final Verification

- [ ] Task 6.1: Full regression check and visual verification
  - Verify: All unit tests pass (`pnpm test` from repo root)
  - Verify: TypeScript compilation passes (`pnpm typecheck`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Manual browser testing with screenshots — landing page, login, verify, complete-profile, dashboard (empty, with trips, search), trip detail page, create trip dialog, edit trip dialog, delete confirmation
  - Verify: Responsive testing — mobile (375px), tablet (768px), desktop (1280px)
  - Verify: Keyboard navigation — skip link works, tab order is logical, dropdowns are keyboard-accessible, focus rings visible
  - Verify: No hardcoded `slate-*`, `gray-50`, `blue-600`, `cyan-600` colors remain in page/component files (only in test files is acceptable)
