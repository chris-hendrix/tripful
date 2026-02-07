# Ralph Progress

Tracking implementation progress for this project.

## Iteration 1 — Task 1.1: Set up design token system, fonts, and gradient button variant

**Status**: COMPLETED
**Date**: 2026-02-07

### Changes Made

4 files modified:

1. **`apps/web/src/app/globals.css`** — Replaced entire `@theme` block with Vivid Capri palette (22 color tokens + success/warning tokens). Added `--font-sans: var(--font-dm-sans)` for DM Sans as default body font. Removed dark mode `:root[class~="dark"]` block. Kept `--radius: 0.5rem`.

2. **`apps/web/src/lib/fonts.ts`** — Added `DM_Sans` import and `dmSans` export with `--font-dm-sans` CSS variable alongside existing Playfair Display.

3. **`apps/web/src/app/layout.tsx`** — Updated to import both font variables, applied via `cn(playfairDisplay.variable, dmSans.variable)` on `<html>`. Added `suppressHydrationWarning`.

4. **`apps/web/src/components/ui/button.tsx`** — Added `gradient` variant to CVA `buttonVariants`: `bg-gradient-to-r from-primary to-accent text-white` with hover/shadow states.

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 3/3 packages clean
- **Linting (`pnpm lint`)**: PASS — 3/3 packages clean
- **Tests (`pnpm test`)**: PASS — 842 tests across 41 files (385 web, 374 API, 83 shared)
- **Reviewer**: APPROVED — all 25 tokens verified correct against architecture doc, all 8 requirements met

### Learnings for Future Iterations

- Existing button variants (`destructive`, `outline`, `ghost`) still contain `dark:` prefixed classes that are now dead code since dark mode was removed. These should be cleaned up in a future task if appropriate.
- The hardcoded `from-blue-600 to-cyan-600` gradient pattern appears in 10+ locations across auth pages, dashboard, trip detail, and dialog components. Task 3.1 will replace these with `<Button variant="gradient">`.
- Tailwind v4 uses CSS-first config via `@theme` — no `tailwind.config.js` file exists. Color tokens are raw HSL values without `hsl()` wrapper.
- Test files assert on specific CSS class strings (e.g., `from-blue-600`); these tests were not broken by Task 1.1 since only the design tokens changed, not the component class strings.

## Iteration 2 — Task 2.1: Build app shell with header, navigation, skip link, and main landmark

**Status**: COMPLETED
**Date**: 2026-02-07

### Changes Made

6 new files, 5 modified files, 4 shadcn component files generated:

**New Files:**
1. **`apps/web/src/components/skip-link.tsx`** — Accessible skip-to-content link. Server component with `sr-only` by default, visible on focus with `focus:not-sr-only focus:absolute`. Uses brand palette (`bg-primary`, `text-primary-foreground`). Targets `#main-content`.

2. **`apps/web/src/components/app-header.tsx`** — Client component (`"use client"`) with sticky header + backdrop blur. Contains: Tripful wordmark in Playfair Display linking to `/dashboard`, `<nav aria-label="Main navigation">` with Dashboard link (active/inactive styling via `usePathname()`), user avatar dropdown (shadcn DropdownMenu + Avatar) showing computed initials from `displayName`, "Profile" link to `/profile`, and "Log out" action via `useAuth().logout()`.

3. **`apps/web/src/components/__tests__/skip-link.test.tsx`** — 5 unit tests for SkipLink (renders link, correct href, anchor element, sr-only class, focus visibility styles).

4. **`apps/web/src/components/__tests__/app-header.test.tsx`** — 16 unit tests for AppHeader (wordmark rendering/link, Playfair font, Dashboard nav link, navigation landmark, header landmark, avatar button, user initials multi-word/single-word/null, dropdown menu, user info display, Profile link, logout callback, active/inactive styling).

5. **`apps/web/tests/e2e/app-shell.spec.ts`** — 6 E2E tests for the app shell (header visibility with wordmark, Dashboard nav link, main content area, user menu dropdown, logout flow, skip link presence).

**Modified Files:**
6. **`apps/web/src/app/(app)/layout.tsx`** — Added `AppHeader` import, wrapped children in `<main id="main-content">`. Server-side auth check preserved.

7. **`apps/web/src/app/layout.tsx`** — Added `SkipLink` as first child of `<body>` (covers both auth and app routes).

8. **`apps/web/src/app/(auth)/layout.tsx`** — Changed inner wrapper `<div>` to `<main id="main-content">` for auth pages.

9. **`apps/web/src/app/(app)/layout.test.tsx`** — Added AppHeader mock, 2 new tests for AppHeader rendering and main landmark.

10. **`apps/web/tests/e2e/auth-flow.spec.ts`** — Un-skipped previously skipped logout test, updated to use new user menu dropdown pattern.

**Generated shadcn Components:**
11. **`apps/web/src/components/ui/dropdown-menu.tsx`** — shadcn generated (with TypeScript strict mode fix: defaulted `checked` to `false`).
12. **`apps/web/src/components/ui/avatar.tsx`** — shadcn generated (with `size` prop customization).
13. **`apps/web/src/components/ui/separator.tsx`** — shadcn generated.
14. **`apps/web/src/components/ui/tooltip.tsx`** — shadcn generated.

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 3/3 packages clean
- **Linting (`pnpm lint`)**: PASS — 3/3 packages clean
- **Tests (`pnpm test`)**: PASS — 865 tests across 43 files (408 web, 374 API, 83 shared)
- **Dev server**: PASS — Both web (:3000) and API (:8000) start correctly
- **Reviewer**: APPROVED — All 9 requirements met, clean implementation, thorough test coverage

### Learnings for Future Iterations

- SkipLink placement: Placed ONLY in root layout (not duplicated in app layout) to avoid two skip links on authenticated pages. Both auth and app routes get exactly one skip link.
- The `(app)/layout.tsx` is an async Server Component using `cookies()` — it cannot use hooks directly. AppHeader is a separate client component imported into it.
- Avatar initials are computed from `displayName` via a `getInitials()` helper that handles multi-word names ("JD"), single names ("A"), and null user ("?").
- The shadcn-generated `dropdown-menu.tsx` had a TypeScript strict mode error with `checked` being potentially `undefined` — fixed by defaulting to `false`.
- The E2E `auth-flow.spec.ts` had a previously skipped logout test that can now work with the new user menu dropdown. Un-skipped and updated.
- The app-shell E2E tests duplicate the login helper from auth-flow tests. A shared test helper file could reduce duplication in future E2E test additions.
- Dashboard nav link uses exact pathname match (`pathname === "/dashboard"`). If dashboard sub-routes are added in the future, `startsWith` would be more appropriate.

