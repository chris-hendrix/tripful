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
