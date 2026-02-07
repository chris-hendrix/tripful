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

