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

## Iteration 2 — Task 1.2: Remove phone from JWT payload and add cache-control headers

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/api/src/services/auth.service.ts` | Removed `phone: user.phoneNumber` from JWT payload in `generateToken()`, updated docstring |
| `apps/api/src/types/index.ts` | Removed `phone: string` from `JWTPayload` interface |
| `apps/api/src/middleware/auth.middleware.ts` | Updated comment to remove `phone` from listed JWT fields |
| `apps/api/src/routes/auth.routes.ts` | Added `onSend` hook setting `Cache-Control: no-store, no-cache, must-revalidate` and `Pragma: no-cache` on all auth routes |
| `apps/api/tests/unit/auth.service.test.ts` | Replaced phone assertions with `not.toHaveProperty("phone")`, removed phone from jwt.sign() |
| `apps/api/tests/integration/security.test.ts` | Removed phone from jwt.sign(), added Cache-Control header test |
| `apps/api/tests/integration/auth.middleware.test.ts` | Removed phone from all jwt.sign() calls and phone assertions |
| `apps/api/tests/integration/auth.complete-profile.test.ts` | Removed phone from jwt.sign(), changed assertion to not.toHaveProperty |
| `apps/api/tests/integration/auth.me-logout.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/auth.verify-code.test.ts` | Changed phone assertion to not.toHaveProperty |
| `apps/api/tests/integration/config-and-improvements.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/trip.routes.test.ts` | Removed phone/phoneNumber from all jwt.sign() calls (16 instances) |
| `apps/api/tests/integration/event.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/invitation.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/message.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/accommodation.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/member-travel.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/notification.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/update-member-role.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/drizzle-improvements.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/notification-hooks.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/user.routes.test.ts` | Removed phone from all jwt.sign() calls |

### Key Decisions

- **onSend hook for cache-control**: Used a Fastify `onSend` hook at the auth route plugin scope level rather than per-route header setting. This ensures all 5 auth endpoints (`request-code`, `verify-code`, `complete-profile`, `me`, `logout`) get cache-control headers automatically, including any future endpoints added to the auth plugin.
- **Negative assertions**: Added `expect(decoded).not.toHaveProperty("phone")` in key tests rather than just removing phone assertions — this actively verifies the security improvement.
- **Both `phone:` and `phoneNumber:` keys**: Initial implementation caught `phone:` keys but missed 4 instances using `phoneNumber:` as the key in jwt.sign() calls in trip.routes.test.ts. These were caught by reviewer and fixed in the same iteration.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unchanged from iteration 1): daily-itineraries worker (10), app-header nav (5), trip metadata (1), URL validation dialogs (2)
- **Reviewer**: APPROVED after fix round — all phone references removed from JWT contexts, cache-control headers correctly implemented

### Learnings for Future Iterations

- Test files may use variant key names (`phone:` vs `phoneNumber:`) — always search for both patterns when doing security-related removals
- Fastify `onSend` hooks registered inside a route plugin are scoped to that plugin's routes — a clean pattern for adding response headers to a group of related endpoints
- No code anywhere accessed `request.user.phone` downstream — the phone in JWT was unused PII, making removal safe with zero runtime impact

## Iteration 3 — Task 1.3: Fix mutedBy schema reference, pg-boss retention, and review redundant index

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/api/src/db/schema/index.ts` | Added `{ onDelete: "cascade" }` to `mutedBy` FK reference on `mutedMembers` table (line 505), making it consistent with `tripId` and `userId` FKs in the same table |
| `apps/api/src/queues/index.ts` | Added `{ deleteAfterSeconds: 3600 }` to `DAILY_ITINERARIES` queue creation, matching `NOTIFICATION_BATCH` retention pattern |
| `apps/api/src/db/migrations/0015_lonely_chamber.sql` | NEW — Auto-generated migration: drops old `muted_members_muted_by_users_id_fk` constraint and recreates it with `ON DELETE CASCADE` |
| `apps/api/src/db/migrations/meta/_journal.json` | Updated migration journal with entry for 0015 |
| `apps/api/src/db/migrations/meta/0015_snapshot.json` | NEW — Drizzle schema snapshot for migration 0015 |

### Key Decisions

- **mutedBy cascade**: The `mutedMembers` table had 3 FK references — `tripId` and `userId` both had `{ onDelete: "cascade" }` but `mutedBy` was missing it. When the muting user is deleted, the mute record should be cleaned up (not left as an orphan), so cascade is the correct behavior.
- **pg-boss retention at 1 hour**: The cron runs every 15 minutes (96 jobs/day). With `deleteAfterSeconds: 3600`, at most ~4 completed jobs exist at any time. This matches the `NOTIFICATION_BATCH` queue pattern — both are ephemeral, fire-and-forget jobs with no diagnostic value after completion.
- **tripIdIsOrganizerIdx kept**: After review, the composite index on `(tripId, isOrganizer)` is NOT redundant — at least 4-5 queries in `trip.service.ts`, `invitation.service.ts`, and `permissions.service.ts` filter on both columns. The composite provides covering index benefit for these common query patterns. The single-column `tripIdIdx` is actually the potentially redundant one (since the composite's leading column is `tripId`), but removing it would be a separate concern outside this task's scope.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unchanged from previous iterations): daily-itineraries worker (10), app-header nav (5), trip metadata (1), URL validation dialogs (2)
- **Migration**: Generated and applied successfully — `0015_lonely_chamber.sql` correctly drops old FK and adds new one with `ON DELETE CASCADE`
- **Reviewer**: APPROVED — all 3 requirements met, clean minimal changes, correct analysis of index usage

### Learnings for Future Iterations

- Drizzle auto-generates migration names with random adjective+noun pairs (e.g., `0015_lonely_chamber.sql`) — don't try to customize them
- pg-boss `createQueue()` accepts `QueueOptions` including `deleteAfterSeconds` and `retentionSeconds` — set these at queue creation time, not at schedule/send time
- PostgreSQL FK constraints do NOT automatically create indexes — explicit indexes are needed for FK columns
- A composite index `(a, b)` can serve single-column queries on `a`, making a separate single-column index on `a` potentially redundant — but this codebase convention is to keep both

## Iteration 4 — Task 1.4: Fix global error handler to display error message

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/app/global-error.tsx` | Added `error` to destructured props, replaced hardcoded error message with `{error.message || "An unexpected error occurred. Please try again later."}` |

### Key Decisions

- **Minimal change**: Only two lines changed — adding `error` to destructuring and making the error message dynamic. No structural, styling, or layout changes.
- **Fallback preserved**: The original hardcoded message is kept as the fallback for cases where `error.message` is empty/undefined, maintaining the same UX for edge cases.
- **Pattern consistency**: The `error.message || "fallback"` pattern matches the three sibling error boundary files: `(app)/error.tsx`, `(auth)/error.tsx`, and `(app)/trips/[id]/error.tsx`.
- **Security safe**: In Next.js production builds, Server Component error messages are automatically sanitized before reaching client error boundaries, so displaying `error.message` does not leak internal details.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 19 pre-existing failures (unchanged): daily-itineraries worker (10), app-header nav (5), auth lockout expiry (1), trip metadata (1), URL validation dialogs (2)
- **Reviewer**: APPROVED — correct implementation, matches existing patterns, minimal and focused diff

### Learnings for Future Iterations

- Pre-existing failure count is 19 (not 18 as previously documented) — `auth.lockout.test.ts > should give fresh 5 attempts after lockout expires` is an additional pre-existing failure not previously listed
- Next.js global-error.tsx must render its own `<html>` and `<body>` tags since it replaces the root layout on error — this is different from segment-level error.tsx files which inherit the parent layout
- The global-error fallback message is intentionally longer than segment-level ones ("Please try again later.") since the error is more severe (entire app failure)

## Iteration 5 — Task 1.5: Phase 1 cleanup

**Status**: COMPLETED
**Date**: 2026-02-20

### Review Findings

Three researchers analyzed all Phase 1 work (Tasks 1.1-1.4) in parallel:

| Check | Result |
|-------|--------|
| All 12 Phase 1 implementation items present in codebase | ✅ Verified |
| FAILURE or BLOCKED tasks | None found |
| Reviewer caveats or conditional approvals | None — all 4 tasks received clean APPROVED |
| Deferred items requiring follow-up tasks | None actionable (see below) |
| Regressions from Phase 1 changes | None detected |

### Deferred Items Analysis

| Item | Assessment | Action |
|------|-----------|--------|
| `tripIdIdx` potentially redundant (Task 1.3) | Minor optimization — composite `tripIdIsOrganizerIdx` covers queries on `tripId` alone, making the single-column index technically redundant. However, keeping both is the codebase convention and the overhead is negligible. | No follow-up task needed |

### Changes Made

| File | Change |
|------|--------|
| `.ralph/VERIFICATION.md` | Updated "Pre-existing Test Failures" section from 3 incomplete categories to 5 complete categories with accurate counts (19 total: daily-itineraries worker 10, app-header nav 5, URL validation dialogs 2, auth lockout expiry 1, trip metadata 1) |

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: 18 failures observed, all pre-existing (auth lockout expiry did not trigger this run — expected for timing-sensitive test). No new regressions.
- **Reviewer**: APPROVED — thorough analysis, accurate documentation update, correct decision to not add new tasks

### Learnings for Future Iterations

- Phase cleanup tasks are valuable for catching documentation drift — the pre-existing failures list was 40% incomplete (missing 11 out of 19 failures)
- The auth lockout expiry test is intermittently flaky (appeared in Task 1.4 but not in this run) — timing-sensitive tests may not reproduce every run
- Phase 1 is fully complete with no outstanding issues — Phase 2 can proceed cleanly

## Iteration 6 — Task 2.1: Standardize Radix UI imports to unified "radix-ui" package

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/components/ui/select.tsx` | Changed `import * as SelectPrimitive from "@radix-ui/react-select"` to `import { Select as SelectPrimitive } from "radix-ui"` |
| `apps/web/src/components/ui/label.tsx` | Changed `import * as LabelPrimitive from "@radix-ui/react-label"` to `import { Label as LabelPrimitive } from "radix-ui"` |
| `apps/web/src/components/ui/dialog.tsx` | Changed `import * as DialogPrimitive from "@radix-ui/react-dialog"` to `import { Dialog as DialogPrimitive } from "radix-ui"` |
| `apps/web/src/components/ui/sheet.tsx` | Changed `import * as DialogPrimitive from "@radix-ui/react-dialog"` to `import { Dialog as DialogPrimitive } from "radix-ui"` |
| `apps/web/src/components/ui/badge.tsx` | Changed import to unified `radix-ui`, updated `Slot` to `Slot.Root` in component assignment |
| `apps/web/src/components/ui/form.tsx` | Replaced two legacy imports with `import { type Label as LabelPrimitive, Slot } from "radix-ui"`, updated `Slot` to `Slot.Root` in type annotation and JSX |
| `apps/web/package.json` | Removed 4 legacy `@radix-ui/react-*` dependencies (dialog, label, select, slot) |

### Key Decisions

- **Inline `type` keyword for LabelPrimitive**: In `form.tsx`, `LabelPrimitive` is only used in a `typeof` expression for type purposes, while `Slot` is used as a runtime value. Used inline `type` syntax (`{ type Label as LabelPrimitive, Slot }`) to satisfy `@typescript-eslint/consistent-type-imports` while keeping a single import statement.
- **Slot → Slot.Root pattern**: The unified `radix-ui` package exports `Slot` as a namespace, not a component. Changed all `Slot` component usages to `Slot.Root`, matching the established pattern in `button.tsx` and `breadcrumb.tsx`.
- **Legacy deps removed**: All 4 individual `@radix-ui/react-*` packages removed from `package.json` dependencies. They remain available as transitive dependencies of `radix-ui`.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages (initial round had 1 ESLint error for missing `type` keyword, fixed in second round)
- **Tests**: All pass. 18 pre-existing failures (unchanged): daily-itineraries worker (10), app-header nav (5), URL validation dialogs (2), trip metadata (1). Auth lockout expiry test passed this run (flaky).
- **Reviewer**: APPROVED after fix round — all 6 files correctly migrated, Slot.Root pattern correct, package.json clean

### Learnings for Future Iterations

- When merging a `type`-only import and a value import into one line, use inline `type` syntax: `import { type Foo, Bar } from "pkg"` — this satisfies `@typescript-eslint/consistent-type-imports`
- The unified `radix-ui` package (v1.4.3) is a thin re-export layer: `export * as X from "@radix-ui/react-x"` — type compatibility is guaranteed since both resolve to the same `.d.ts` files
- `Slot` from `radix-ui` is a namespace (`{ Root, Slot, Slottable, createSlot, createSlottable }`), not a component — always use `Slot.Root` after migration
- When deleting lines from JSON files with the Edit tool, verify that adjacent lines retain proper indentation
- Pre-existing test failure count: 18-19 depending on whether the flaky auth lockout expiry test triggers

## Iteration 7 — Task 2.2: Fix focus styling, add "use client" directives, and refactor Select to CVA

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/components/ui/dialog.tsx` | Replaced old `ring-offset-background focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-hidden` on close button with standardized `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden` |
| `apps/web/src/components/ui/sheet.tsx` | Identical focus fix to dialog.tsx on close button |
| `apps/web/src/components/ui/datetime-picker.tsx` | Replaced inconsistent `ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` on time input with `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| `apps/web/src/components/ui/button.tsx` | Added `"use client";` directive as line 1 |
| `apps/web/src/components/ui/input.tsx` | Added `"use client";` directive as line 1 |
| `apps/web/src/components/ui/card.tsx` | Added `"use client";` directive as line 1 |
| `apps/web/src/components/ui/badge.tsx` | Added `"use client";` directive as line 1 |
| `apps/web/src/components/ui/select.tsx` | Refactored `SelectTrigger` from ad-hoc `data-[size=*]` CSS to `cva` variant pattern with `selectTriggerVariants` export, matching `buttonVariants` approach |
| `apps/web/src/components/ui/__tests__/select.test.tsx` | NEW — 6 tests covering `selectTriggerVariants` output and rendered `SelectTrigger` component |

### Key Decisions

- **3 files needed focus fixes, not 2**: dialog.tsx and sheet.tsx had `focus:` (bare) patterns, while datetime-picker.tsx had `focus-visible:` but with the old ring-2/ring-offset style. All three were unified to the standard `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` pattern.
- **Menu item `focus:bg-accent` preserved**: The `focus:bg-accent focus:text-accent-foreground` patterns in select.tsx and dropdown-menu.tsx were intentionally NOT changed — these are background-highlight patterns for Radix menu items that receive focus programmatically during keyboard navigation, not ring-based focus indicators.
- **`has-focus:` in calendar.tsx preserved**: The `has-focus:border-ring has-focus:ring-ring/50 has-focus:ring-[3px]` pattern is parent-level focus detection with correct ring values already matching the standard — no change needed.
- **`data-size` attribute retained**: The `data-size={size}` attribute was kept on `SelectTrigger` even after CVA refactor, matching the Button component convention and allowing external CSS targeting.
- **`ring-offset-background` fully removed**: This deprecated Tailwind v3/old shadcn token had 3 remaining references — all removed. Zero matches remain in the UI components directory.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unchanged): daily-itineraries worker (10), app-header nav (5), URL validation dialogs (2), trip metadata (1). Auth lockout expiry test passed this run.
- **Grep checks**: Zero `focus:ring-*` patterns remaining in `components/ui/` (only `has-focus:` in calendar.tsx and `focus:bg-accent` in menu items); zero `ring-offset-background` references remaining.
- **Reviewer**: APPROVED — all 4 requirements met, CVA pattern matches button.tsx, tests comprehensive

### Reviewer Notes

- `skip-link.tsx` (outside `components/ui/`) still uses old `focus:ring-2 focus:ring-offset-2` pattern — out of scope for this task but noted for potential future cleanup
- Calendar `has-focus:` pattern correctly identified as different use case and left untouched

### Learnings for Future Iterations

- Three distinct focus ring patterns existed in the codebase: (A) modern `focus-visible:` with 3px ring (correct), (B) old `focus:` with ring-2/ring-offset-2 (dialog/sheet), (C) hybrid `focus-visible:` with old ring style (datetime-picker). Always check for all variants when standardizing.
- Menu items in Radix components use `focus:bg-accent` (not `focus-visible:`) intentionally — they receive focus programmatically during keyboard navigation, not just from Tab key. Don't blindly replace all `focus:` patterns.
- CVA refactoring for size variants: replace `data-[size=X]:class` selectors with direct CVA variant classes. Keep `data-size` attribute for external CSS compatibility.
- Pre-existing test failure count: 18 this run (auth lockout expiry flaky test passed)

## Iteration 8 — Task 2.3: Phase 2 cleanup

**Status**: COMPLETED
**Date**: 2026-02-20

### Review Findings

Three researchers analyzed all Phase 2 work (Tasks 2.1-2.2) in parallel:

| Check | Result |
|-------|--------|
| All 8 Phase 2 implementation items present in codebase | ✅ Verified |
| FAILURE or BLOCKED tasks | None found |
| Reviewer caveats or conditional approvals | None — both tasks received APPROVED |
| Deferred items requiring follow-up tasks | None actionable (see below) |
| Regressions from Phase 2 changes | None detected |
| VERIFICATION.md Phase 2 checks pass | ✅ All 3 items verified |

### Deferred Items Analysis

| Item | Assessment | Action |
|------|-----------|--------|
| `skip-link.tsx` old focus ring pattern (Task 2.2 reviewer note) | Out of scope — file is at `apps/web/src/components/skip-link.tsx`, not in `components/ui/`. Uses `focus:` intentionally for `sr-only focus:not-sr-only` visibility toggle. Only the ring values (`ring-2 ring-offset-2`) are cosmetically stale, not the `focus:` prefix. Functionally correct. | No follow-up task needed |

### Changes Made

| File | Change |
|------|--------|
| None | No code changes needed — Phase 2 is fully complete per ARCHITECTURE.md specification |

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: 2,349 passed, 18 failed — all pre-existing (daily-itineraries worker 10, app-header nav 5, URL validation dialogs 2, trip metadata 1). Auth lockout expiry flaky test passed this run. No new regressions.
- **Reviewer**: APPROVED — thorough analysis, all Phase 2 spec items verified, skip-link decision justified

### Learnings for Future Iterations

- Phase 2 cleanup pattern mirrors Phase 1: verify all implementation items, check PROGRESS.md for caveats/deferred items, validate against ARCHITECTURE.md spec, run full test suite
- Skip-link components use `focus:` (not `focus-visible:`) intentionally for visibility toggle — the `sr-only focus:not-sr-only` pattern requires bare `focus:` to work across all user agents
- Pre-existing test failure count: 18 this run (stable across iterations 5-8)
- Phase 2 is fully complete with no outstanding issues — Phase 3 can proceed cleanly
