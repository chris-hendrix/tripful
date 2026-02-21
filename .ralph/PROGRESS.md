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
