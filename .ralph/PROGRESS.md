# Progress: E2E Test Simplification

## Iteration 1 — Task 1.1: Delete files and remove individual tests covered by unit tests

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and all 23 E2E tests pass
**Reviewer**: APPROVED

### Changes Made

**Files deleted (2):**
- `apps/web/tests/e2e/app-shell.spec.ts` (1 test — covered by `app-header.test.tsx` and `skip-link.test.tsx`)
- `apps/web/tests/e2e/invitation-helpers.spec.ts` (2 tests — internal helper verification, not user flows)

**Tests removed from existing files (6):**
- `trip-journey.spec.ts`: "trip form validation" — covered by `trip-schemas.test.ts` and `create-trip-dialog.test.tsx`
- `itinerary-journey.spec.ts`: "itinerary permissions and validation" — covered by `event-schemas.test.ts` and event dialog tests
- `itinerary-journey.spec.ts`: "meetup location and time on event card" — covered by `event-card.test.tsx`
- `itinerary-journey.spec.ts`: "multi-day event badge" — covered by `event-card.test.tsx`
- `messaging.spec.ts`: "restricted states journey" — edge case covered by unit tests
- `notifications.spec.ts`: "notification preferences journey" — covered by `notification-preferences.test.tsx`

**Orphaned imports cleaned:**
- `itinerary-journey.spec.ts`: Removed `TripsPage`, `TripDetailPage` (from `./helpers/pages`), `pickDate` (from `./helpers/date-pickers`)
- `notifications.spec.ts`: Removed `dismissToast` (from `./helpers/toast`)

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 23 tests in 7 files |
| Deleted files confirmed gone | PASS |
| `helpers/invitations.ts` preserved | PASS |

### Notes

- **Test count is 23, not 24** as predicted in TASKS.md. The planning doc assumed `invitation-helpers.spec.ts` had 1 test, but it had 2, so 9 tests were removed (32 − 9 = 23). Task 1.2 merges will bring this to 21 (not 22). Downstream task verification milestones should use actual counts.
- **Reviewer suggestion (LOW)**: JSDoc comments in `notifications.spec.ts` and `messaging.spec.ts` say "3 journey tests" but now have 2. Non-blocking — can be addressed in Task 1.3 cleanup.

## Iteration 2 — Task 1.2: Merge auth tests and notification tests

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and all 21 E2E tests pass (3 verification rounds)
**Reviewer**: APPROVED

### Changes Made

**`auth-journey.spec.ts`** (3 tests → 2 tests):
- Merged "auth guards" + "authenticated user redirects away from public pages" → "auth redirects and guards"
- Combined flow: unauthenticated redirect to /login → authenticateUser (single call) → existing user skips complete-profile → / redirects to /trips → /login redirects to /trips
- Saves one `authenticateUser` call (API user creation + browser login cycle)
- "complete auth journey" (@smoke) left unchanged

**`notifications.spec.ts`** (2 tests → 1 test):
- Merged "notification bell and dropdown journey" + "mark all as read and trip notification bell journey" → "notification flow"
- Combined flow: setup organizer + member + trip + 2 messages → poll for 2 unread → verify global bell shows 2 unread → click bell dropdown → verify 2 notification items → click one notification → navigate to trip → verify trip bell shows 1 unread → open trip dialog (shows 2 items: read + unread) → mark all as read → verify both trip and global bells show zero
- Tag: @smoke + @slow (covers the critical notification path)
- Eliminates full duplicate setup cycle (2 user creations, 1 trip creation, 1 invite, 1 RSVP, message posting)
- Updated JSDoc to reflect single-test structure

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 21 tests in 7 files |
| Test count: auth-journey.spec.ts | 2 tests (was 3) |
| Test count: notifications.spec.ts | 1 test (was 2) |

### Fix Log

- **Fix 1**: Trip notification dialog shows ALL notifications (read + unread), not just unread. Changed `toHaveCount(1)` to `toHaveCount(2)` in the trip dialog assertion step.
- **Fix 2**: `page.getByText("New message")` strict mode violation — resolved to 2 elements with 2 notifications. Changed to `.first()` since the count is already verified separately.

### Notes

- **Test count is 21** (23 − 2 merges = 21). TASKS.md predicted 22 but that was based on the original 32 − 8 = 24 estimate. Actual: 32 − 9 = 23 after Task 1.1, then 23 − 2 = 21 after Task 1.2. Downstream tasks should use 21 as the baseline.
- **Reviewer suggestion (LOW)**: The auth-journey file uses hardcoded `timeout: 5000` instead of imported timeout constants. Pre-existing, not introduced by this change. Can be addressed in a future consistency pass.
- **Reviewer confirmed**: The soft assertion `expect.soft(page.getByText(/Alice:.*First message from Alice/))` was restored in the merged notification test, preserving notification content rendering coverage.

## Iteration 3 — Task 1.3: Phase 1 cleanup

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and all 21 E2E tests pass
**Reviewer**: APPROVED

### Changes Made

**Deferred items from Task 1.1 — fixed:**
- `messaging.spec.ts` line 25: JSDoc said "3 journey tests" → corrected to "2 journey tests" (the "restricted states journey" was removed in Task 1.1)

**Deferred items from Task 1.2 — fixed:**
- `auth-journey.spec.ts`: Added `import { NAVIGATION_TIMEOUT } from "./helpers/timeouts"` and replaced 4 hardcoded `timeout: 5000` values with `timeout: NAVIGATION_TIMEOUT` (lines 86, 97, 109, 115). This aligns with the pattern used by other spec files.

**Test count corrections across .ralph/ docs:**
- TASKS.md: Updated 6 downstream task references from "22 tests" to "21 tests"; corrected Task 1.1 verify from "24 (32 - 8)" to "23 (32 - 9)"; corrected Task 2.1 regression count from "16" to "15"
- VERIFICATION.md: Updated 3 milestone references from "22" to "21"; corrected Task 1.1 milestone from "24 (8 removed)" to "23 (9 removed)"
- ARCHITECTURE.md: Updated target state from "22 tests" to "21 tests" (2 lines); corrected @regression count from "16" to "15"; corrected notifications.spec.ts entry from "(2: ...)" to "(1: notification flow @smoke)"

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 21 tests in 7 files |
| `playwright test --list` | 21 tests confirmed |

### Notes

- **No new tasks needed**: All deferred items from Phase 1 were simple fixes addressed directly in this cleanup.
- **Out-of-scope pre-existing issues identified but not fixed**: (1) `trip-journey.spec.ts` JSDoc says "3 journey tests" but has 6 — pre-existing before this branch. (2) Dead auth helper functions (`authenticateUserWithPhone`, `authenticateUserViaBrowser`, `authenticateUserViaBrowserWithPhone`) in `helpers/auth.ts` — pre-existing. (3) Mixed hardcoded/constant timeouts in other spec files — pre-existing.
- **Phase 1 is now complete**. All 3 tasks done, 21 tests passing across 7 files. Ready for Phase 2.

## Iteration 4 — Task 2.1: Update smoke/regression tags, optimize helpers, and increase workers

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, 21 E2E tests pass, 6 smoke tests pass
**Reviewer**: APPROVED

### Changes Made

**Tag assignments (all 21 tests now explicitly tagged):**
- 6 tests tagged `@smoke`: complete auth journey, trip CRUD journey, invitation and RSVP journey, itinerary CRUD journey, messaging CRUD journey, notification flow
- 15 tests tagged `@regression`: all remaining tests
- `profile page navigation and editing` changed from `@smoke` to `@regression` (not in the specified 6 smoke tests; matches ARCHITECTURE.md target state)
- `organizer actions journey` already had `@regression` — no change needed

**Files modified for tags:**
- `auth-journey.spec.ts`: Added `{ tag: "@regression" }` to "auth redirects and guards"
- `trip-journey.spec.ts`: Added `{ tag: "@regression" }` to 5 tests (permissions, auto-lock, remove member, promote/demote, delegation)
- `invitation-journey.spec.ts`: Added `{ tag: "@regression" }` to 4 tests (RSVP status, uninvited access, member list, onboarding wizard)
- `itinerary-journey.spec.ts`: Added `{ tag: "@regression" }` to 2 tests (view modes, deleted items)
- `profile-journey.spec.ts`: Changed "profile page navigation and editing" from `@smoke` to `@regression`; added `{ tag: "@regression" }` to "profile photo upload and remove"

**`inviteAndAcceptViaAPI` cookie optimization:**
- Added optional `inviterCookie?: string` parameter (6th positional arg) to `helpers/invitations.ts`
- When provided, skips `createUserViaAPI(request, inviterPhone)` re-auth (saves 3 API calls per invocation)
- Uses `const resolvedInviterCookie = inviterCookie ?? (await createUserViaAPI(request, inviterPhone))` for backward compatibility
- Updated JSDoc to document the optional cookie path
- Updated all 5 callers to pass existing `organizerCookie`:
  - `trip-journey.spec.ts`: 3 call sites (remove member, promote/demote, delegation)
  - `invitation-journey.spec.ts`: 2 call sites (RSVP status, member list)
- Note: `messaging.spec.ts` and `notifications.spec.ts` do NOT call `inviteAndAcceptViaAPI` (they use `inviteViaAPI` + `rsvpViaAPI` directly), so no changes were needed despite TASKS.md listing them

**Infrastructure:**
- `playwright.config.ts`: Changed CI workers from 2 to 4 (`workers: process.env.CI ? 4 : 1`)
- `apps/web/package.json`: Added `"test:e2e:smoke": "playwright test --grep @smoke"` script

**test.slow() review:**
- All 11 `test.slow()` calls confirmed in active tests — none orphaned from deleted tests

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 21 tests in 7 files (2.8m) |
| `pnpm test:e2e:smoke` | PASS — 6 tests (57.2s) |
| `playwright test --list` | 21 tests in 7 files confirmed |
| `--grep @smoke --list` | 6 smoke tests confirmed |
| `inviterCookie` backward compat | PASS — optional param, falls back to re-auth |
| CI workers | 4 (was 2) |

### Notes

- **TASKS.md inaccuracy**: Task listed `messaging.spec.ts` and `notifications.spec.ts` as callers of `inviteAndAcceptViaAPI`, but they use `inviteViaAPI` + `rsvpViaAPI` directly. Only `trip-journey.spec.ts` and `invitation-journey.spec.ts` call `inviteAndAcceptViaAPI`.
- **Reviewer suggestion (LOW, addressed)**: JSDoc for `inviteAndAcceptViaAPI` step 1 updated from "Re-authenticate inviter" to "Use provided cookie or re-authenticate inviter" to reflect the optional cookie path.
- **Savings**: 5 call sites × 3 API calls skipped = 15 fewer API round trips across the test suite.

## Iteration 5 — Task 2.2: Phase 2 cleanup

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and all 21 E2E tests pass
**Reviewer**: APPROVED

### Review of Phase 2 (Task 2.1)

**FAILURE / BLOCKED items**: None. Task 2.1 completed successfully with all checks passing.

**Reviewer caveats from Task 2.1**: One LOW suggestion (JSDoc for `inviteAndAcceptViaAPI`) was already addressed during Task 2.1 itself.

**Deferred items from Task 2.1**: The TASKS.md inaccuracy about `messaging.spec.ts` and `notifications.spec.ts` being callers of `inviteAndAcceptViaAPI` was already documented in PROGRESS.md Iteration 4. No code fix needed — the actual implementation correctly only updated real callers.

### Changes Made

**JSDoc corrections (2 files):**
- `trip-journey.spec.ts` line 17: Changed "Consolidates 10 individual trip tests into 3 journey tests" → "6 journey tests" (file has 6 tests, not 3; pre-existing inaccuracy flagged in Iteration 3)
- `profile-journey.spec.ts` line 12: Changed "in a single journey test" → "in 2 journey tests" (file has 2 tests, not 1; newly identified)

**Researcher false positive**: Researcher 2 flagged `authenticateViaAPI` as an unused import in `trip-journey.spec.ts`, but coder verified it IS used on line 30 in the "trip CRUD journey" test. No change made.

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 21 tests in 7 files (3.2m) |
| `playwright test --list` | 21 tests confirmed |

### Notes

- **No new tasks needed**: All Phase 2 deferred items were either already addressed or required only simple JSDoc fixes.
- **Pre-existing out-of-scope issues confirmed unchanged**: (1) Dead auth helpers in `helpers/auth.ts` (`authenticateUserWithPhone`, `authenticateUserViaBrowser`, `authenticateUserViaBrowserWithPhone`). (2) Hardcoded timeouts in `trip-journey.spec.ts`, `itinerary-journey.spec.ts`, `profile-journey.spec.ts`, and partially `invitation-journey.spec.ts`. (3) Hardcoded `http://localhost:8000` in 8 locations across 3 spec files instead of `API_BASE`. All pre-existing before this branch.
- **Phase 2 is now complete**. All 2 tasks done, 21 tests passing across 7 files, 6 smoke / 15 regression. Ready for Phase 3.
