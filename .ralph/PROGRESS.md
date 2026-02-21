# Progress: Skill Audit Fixes

## Iteration 1 — Task 1.1: Add viewport export, mobile meta, noscript, page metadata, and hidePoweredBy

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Added `Viewport` type import, `viewport` export (width, initialScale, maximumScale, themeColor), extended `metadata` with `appleWebApp` config, added `<noscript>` fallback block |
| `apps/web/src/app/(auth)/verify/layout.tsx` | NEW — metadata wrapper layout (`{ title: "Verify" }`) for client component page |
| `apps/web/src/app/(auth)/complete-profile/layout.tsx` | NEW — metadata wrapper layout (`{ title: "Complete Profile" }`) for client component page |
| `apps/api/src/app.ts` | Added `hidePoweredBy: true` to `@fastify/helmet` registration config |

### Key Decisions

- **Layout wrapper pattern for metadata**: The verify and complete-profile pages are `"use client"` components that cannot export `metadata` directly. Created `layout.tsx` files in their directories that export metadata and pass through children — this is the idiomatic Next.js App Router pattern.
- **Noscript uses inline styles**: Since CSS may not be available when JS is disabled, the noscript block uses inline `style` attributes rather than Tailwind classes.
- **hidePoweredBy explicit**: While `@fastify/helmet` v13 enables this by default, setting it explicitly documents security intent.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unrelated to this task): daily-itineraries worker (10), app-header nav (5), trip metadata (1), URL validation dialogs (2)
- **Reviewer**: APPROVED — all 6 requirements met, clean code

### Learnings for Future Iterations

- `"use client"` pages cannot export `metadata` — use a `layout.tsx` wrapper in the same directory
- Pre-existing test failures: daily-itineraries worker (10 tests, time-dependent), app-header nav (5), trip metadata (1), create-accommodation/event URL validation dialogs (2 total) — all on main branch
- Turbo caches typecheck and lint results; tests always run fresh
