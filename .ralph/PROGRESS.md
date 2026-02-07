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

**Modified Files:** 6. **`apps/web/src/app/(app)/layout.tsx`** — Added `AppHeader` import, wrapped children in `<main id="main-content">`. Server-side auth check preserved.

7. **`apps/web/src/app/layout.tsx`** — Added `SkipLink` as first child of `<body>` (covers both auth and app routes).

8. **`apps/web/src/app/(auth)/layout.tsx`** — Changed inner wrapper `<div>` to `<main id="main-content">` for auth pages.

9. **`apps/web/src/app/(app)/layout.test.tsx`** — Added AppHeader mock, 2 new tests for AppHeader rendering and main landmark.

10. **`apps/web/tests/e2e/auth-flow.spec.ts`** — Un-skipped previously skipped logout test, updated to use new user menu dropdown pattern.

**Generated shadcn Components:** 11. **`apps/web/src/components/ui/dropdown-menu.tsx`** — shadcn generated (with TypeScript strict mode fix: defaulted `checked` to `false`). 12. **`apps/web/src/components/ui/avatar.tsx`** — shadcn generated (with `size` prop customization). 13. **`apps/web/src/components/ui/separator.tsx`** — shadcn generated. 14. **`apps/web/src/components/ui/tooltip.tsx`** — shadcn generated.

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

## Iteration 3 — Task 3.1: Migrate all hardcoded colors to design tokens across the entire app

**Status**: COMPLETED
**Date**: 2026-02-07

### Changes Made

9 source files modified, 6 test files updated, 1 shadcn component installed:

**Source Files Modified:**

1. **`apps/web/src/app/(app)/dashboard/dashboard-content.tsx`** — All hardcoded colors replaced with design tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `border-border`, `border-input`, `bg-muted`, `text-destructive`, `border-destructive/30`, `focus-visible:border-ring`, `focus-visible:ring-ring`, `shadow-primary/25`). SkeletonCard uses token colors. FAB converted from raw `<button>` to `<Button variant="gradient" size="icon">`. Two gradient buttons use `variant="gradient"`. Added `aria-live="polite"` to trip list container.

2. **`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`** — All hardcoded colors replaced with design tokens. Success banner uses `bg-success/10 border-success/30 text-success`. Placeholder hero gradient uses `from-muted to-primary/10`. "Return to dashboard" wrapped with `<Button variant="gradient" asChild>`. RSVP badges use `bg-success/15 text-success`, organizer badge uses `from-primary to-accent`. Avatar initials use `bg-muted text-foreground`.

3. **`apps/web/src/components/trip/trip-card.tsx`** — RSVP badge colors: Going=`bg-success/15 text-success border-success/30`, Maybe=`bg-warning/15 text-warning border-warning/30`, Not Going=`text-muted-foreground border-input`. Placeholder gradient=`from-muted to-primary/10`. Avatar initials=`bg-muted text-foreground`. All text/border/bg colors tokenized.

4. **`apps/web/src/components/trip/create-trip-dialog.tsx`** — Step indicators use `from-primary to-accent` / `bg-muted text-muted-foreground`. All form labels, descriptions, inputs use design tokens. Continue and Create buttons use `variant="gradient"`. Co-organizer remove button converted to `<Button variant="ghost" size="icon">` with `min-w-[44px] min-h-[44px]` touch target.

5. **`apps/web/src/components/trip/edit-trip-dialog.tsx`** — Same token migration as create-trip-dialog. Inline delete confirmation replaced with `<AlertDialog>` component (AlertDialogTrigger, AlertDialogContent, AlertDialogAction variant="destructive", AlertDialogCancel). Co-organizer remove button has 44x44px touch target.

6. **`apps/web/src/components/trip/image-upload.tsx`** — Remove and retry buttons converted from raw `<button>` to `<Button>` components with `min-w-[44px] min-h-[44px]` touch targets. All colors tokenized: upload zone uses `from-muted to-primary/10`, drag active uses `border-primary bg-primary/10`, error uses `bg-destructive/10 border-destructive/30 text-destructive`.

7. **`apps/web/src/app/(auth)/login/page.tsx`** — `<h2>` changed to `<h1>`. All colors tokenized. `autoComplete="tel"` and `aria-required="true"` added to phone input. Gradient button uses `variant="gradient"`.

8. **`apps/web/src/app/(auth)/verify/page.tsx`** — `<h2>` changed to `<h1>`. All colors tokenized. `autoComplete="one-time-code"` and `aria-required="true"` added to code input. Resend success text uses `text-success`. Links use `text-primary hover:text-primary/80`. Gradient button uses `variant="gradient"`.

9. **`apps/web/src/app/(auth)/complete-profile/page.tsx`** — `<h2>` changed to `<h1>`. All colors tokenized. `autoComplete="name"` and `aria-required="true"` added to display name input. Gradient button uses `variant="gradient"`.

**Component Installed:**

10. **`apps/web/src/components/ui/alert-dialog.tsx`** — AlertDialog component installed via `pnpm dlx shadcn@latest add alert-dialog`.

**Test Files Updated:**

11. **`apps/web/src/components/trip/__tests__/trip-card.test.tsx`** — Updated class assertions: `bg-emerald-100`→`bg-success/15`, `text-emerald-700`→`text-success`, `bg-amber-100`→`bg-warning/15`, `text-amber-700`→`text-warning`, `text-slate-600`→`text-muted-foreground`, placeholder gradient selector updated, `bg-slate-300`→`bg-muted`.

12. **`apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`** — Updated placeholder gradient selector and success banner assertions: `bg-green-50`→`bg-success/10`, `border-green-200`→`border-success/30`.

13. **`apps/web/src/components/trip/__tests__/create-trip-dialog.test.tsx`** — Gradient button assertions updated: `from-blue-600`→`from-primary`, `to-cyan-600`→`to-accent`.

14. **`apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx`** — Gradient button assertions updated for Continue and Update buttons. Delete confirmation tests adapted for AlertDialog behavior.

15. **`apps/web/src/components/trip/__tests__/image-upload.test.tsx`** — Drag/drop assertions: `border-blue-500`→`border-primary`. Error styling: `text-red-700`→`text-destructive`, `.bg-red-50`→`.bg-destructive\/10`.

16. **`apps/web/tests/e2e/auth-flow.spec.ts`** — All auth page selectors changed from `h2:has-text(...)` to `h1:has-text(...)`.

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 3/3 packages clean
- **Linting (`pnpm lint`)**: PASS — 3/3 packages clean
- **Tests (`pnpm test`)**: PASS — 865 tests across 43 files (408 web, 374 API, 83 shared)
- **Reviewer**: APPROVED — All 16 sub-requirements verified and satisfied, zero hardcoded colors remain in target files

### Learnings for Future Iterations

- Files outside the 9 target files still contain hardcoded colors: `loading.tsx` files, `not-found.tsx`, `global-error.tsx`, `error.tsx` pages. These are addressed in later tasks (Task 4.1 for loading states, Task 5.1 for auth layout redesign).
- The `(auth)/layout.tsx` still uses hardcoded dark gradient colors (`from-slate-950 via-blue-950 to-amber-950`). This is scheduled for Task 5.1 (auth layout redesign).
- Installing shadcn components (e.g., `alert-dialog`) can overwrite existing files like `button.tsx` — always verify the gradient variant is preserved after any shadcn installation.
- Test selectors using CSS class names with slashes (e.g., `bg-destructive/10`) need escaping in querySelector: `.bg-destructive\\/10`.
- The `variant="gradient"` Button absorbs all gradient/shadow/color classes, so only layout classes (width, height, rounding, flex) should remain in className.
- `autoComplete` in React JSX is camelCase (not `autocomplete`), matching the React DOM API.

## Iteration 4 — Task 4.1: Add Sonner toast system, breadcrumbs, and replace inline notifications

**Status**: COMPLETED
**Date**: 2026-02-07

### Changes Made

3 new shadcn files, 5 source files modified, 3 test files updated:

**New shadcn Components (installed via `pnpm dlx shadcn@latest add sonner breadcrumb skeleton`):**

1. **`apps/web/src/components/ui/sonner.tsx`** — Toaster wrapper component for Sonner. Fixed for TypeScript `exactOptionalPropertyTypes` and ESLint `no-undef` rules.

2. **`apps/web/src/components/ui/breadcrumb.tsx`** — Breadcrumb component with BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator. No modifications needed.

3. **`apps/web/src/components/ui/skeleton.tsx`** — Skeleton loading placeholder component with `animate-pulse bg-primary/10 rounded-md`. Fixed ESLint `no-undef` by importing `ComponentProps` from React.

**Source Files Modified:**

4. **`apps/web/src/app/providers/providers.tsx`** — Added `<Toaster />` import from `@/components/ui/sonner` and rendered inside `QueryClientProvider` after `ReactQueryDevtools`.

5. **`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`** — Removed `showSuccessBanner` useState and the fixed-position success banner JSX. Replaced `onSuccess` callback with `toast.success("Trip updated successfully")`. Added Breadcrumb navigation above hero section with "My Trips" link to `/dashboard` and current trip name. Replaced hand-built `SkeletonDetail` divs with shadcn `<Skeleton>` components.

6. **`apps/web/src/components/trip/create-trip-dialog.tsx`** — Added `import { toast } from "sonner"`. Replaced `form.clearErrors("root")` + `form.setError("root", ...)` pattern with `toast.error(...)` in `handleSubmit` `onError`. Removed root error `<p>` JSX block.

7. **`apps/web/src/components/trip/edit-trip-dialog.tsx`** — Added `import { toast } from "sonner"`. Replaced `form.clearErrors("root")` + `form.setError("root", ...)` with `toast.error(...)` for both update and delete errors. Added `toast.success("Trip deleted successfully")` in `handleDelete` `onSuccess`. Removed root error `<p>` JSX block.

8. **`apps/web/src/app/(app)/dashboard/dashboard-content.tsx`** — Added `import { Skeleton } from "@/components/ui/skeleton"`. Replaced hand-built `SkeletonCard` inner divs (`<div className="h-X bg-muted rounded ...">`) with `<Skeleton className="h-X w-Y">`. Removed `animate-pulse` from outer card wrapper (each Skeleton has its own animation).

**Test Files Updated:**

9. **`apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`** — Added sonner mock via `vi.hoisted()` + `vi.mock("sonner")`. Replaced 4 success banner tests with 2 toast verification tests (toast called on success, not called on initial load). Added 2 breadcrumb tests (renders "My Trips" with trip name, link points to `/dashboard`). Tightened heading queries from `getByText` to `getByRole("heading", ...)` to disambiguate from breadcrumb text.

10. **`apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx`** — Added sonner mock via `vi.hoisted()` + `vi.mock("sonner")`. Updated "shows error message on update failure" and "shows error message on delete failure" tests to verify `mockToast.error` instead of checking DOM text.

11. **`apps/web/src/components/trip/__tests__/create-trip-dialog.test.tsx`** — Added sonner mock via `vi.hoisted()` + `vi.mock("sonner")` for future error toast testing.

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 3/3 packages clean
- **Linting (`pnpm lint`)**: PASS — 3/3 packages clean
- **Tests (`pnpm test`)**: PASS — 865 tests across 43 files (408 web, 374 API, 83 shared)
- **Reviewer**: APPROVED — All 9 task requirements met, no dead code, correct imports, quality breadcrumb and skeleton implementations, thorough test coverage

### Learnings for Future Iterations

- shadcn-generated `sonner.tsx` and `skeleton.tsx` needed minor fixes for this project's strict TypeScript (`exactOptionalPropertyTypes`) and ESLint (`no-undef`) configs. Always check generated files after shadcn installation.
- The `vi.hoisted()` pattern is required when Vitest mock factories reference variables defined outside the factory. Use `const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))` before `vi.mock("sonner", ...)`.
- When both a breadcrumb and a heading display the same text (trip name), test selectors must be specific. Use `getByRole("heading", { name: "..." })` instead of `getByText("...")` to avoid ambiguity.
- The `Toaster` component from shadcn imports `useTheme` from `next-themes`, but no `ThemeProvider` is configured. It falls back to system theme. If dark mode support is added later, a `ThemeProvider` from `next-themes` should be added to providers.
- Field-level form validation (Zod `FormMessage` components) and client-side validation states (like `coOrganizerError`) are separate concerns from API error notifications and should NOT be replaced with toasts.
- The `loading.tsx` files in dashboard and trip detail still use hardcoded `bg-slate-200` colors. These were not in scope for Task 4.1 and should be addressed in a future task.
- Installing shadcn components can overwrite existing files like `button.tsx` — always verify the gradient variant is preserved after any shadcn installation. In this iteration, button.tsx was NOT overwritten.
