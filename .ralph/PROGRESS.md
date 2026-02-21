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

## Iteration 6 — Task 3.1: Add CI smoke job, sharding, and report merging

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and YAML validation all pass
**Reviewer**: APPROVED (one LOW-severity finding addressed inline)

### Changes Made

**`apps/web/playwright.config.ts`** (1 change):
- Line 20: Changed `reporter: "html"` to `reporter: process.env.CI ? "blob" : "html"`. Blob reporter in CI enables shard report merging; HTML reporter preserved for local development. Follows the existing `process.env.CI` ternary pattern used for `forbidOnly` (line 15), `workers` (line 17), and `reuseExistingServer` (lines 59, 67).

**`.github/workflows/ci.yml`** (3 jobs added/modified):

1. **`e2e-smoke` job (NEW, lines 173-233)**: Runs only `@smoke`-tagged E2E tests on PRs.
   - Condition: `github.event_name == 'pull_request'` AND (api/web/shared changes detected)
   - Same postgres service, browser install, and migration steps as existing e2e job
   - Command: `playwright test --grep @smoke` (6 tests)
   - Timeout: 30 minutes
   - Uploads blob report as `smoke-report` artifact (7-day retention)

2. **`e2e-tests` job (MODIFIED, lines 235-298)**: Runs full suite on main branch only, with 2-shard matrix.
   - Condition changed from changes-based (api/web/shared) to main-only: `github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'`
   - Added matrix strategy: `shardIndex: [1, 2]`, `shardTotal: [2]`, `fail-fast: false`
   - Command: `playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`
   - Artifact: per-shard blob reports (`blob-report-1`, `blob-report-2`) with 1-day retention

3. **`merge-e2e-reports` job (NEW, lines 300-337)**: Merges sharded blob reports into single HTML report.
   - Depends on `e2e-tests`
   - Condition: `!cancelled() && needs.e2e-tests.result != 'skipped'` (prevents running on PRs where e2e-tests is skipped)
   - Downloads all `blob-report-*` artifacts with `merge-multiple: true`
   - Runs `npx playwright merge-reports --reporter html ./all-blob-reports`
   - Uploads merged HTML report as `playwright-report` (30-day retention)

### Reviewer Finding (addressed)

- **[LOW, FIXED]**: The reviewer identified that `if: ${{ !cancelled() }}` on `merge-e2e-reports` would cause the job to run and fail on PRs (where `e2e-tests` is skipped, producing no blob artifacts). Fixed by adding `needs.e2e-tests.result != 'skipped'` guard to the condition.

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| YAML syntax validation | PASS |
| Job dependencies correct | PASS (`merge-e2e-reports` → `e2e-tests`, both smoke/e2e → `changes`) |
| Artifact names unique | PASS (`smoke-report`, `blob-report-1`, `blob-report-2`, `playwright-report`) |
| Action versions consistent | PASS (checkout@v6, setup-node@v6, upload-artifact@v6, download-artifact@v6, pnpm/action-setup@v4) |

### Notes

- **Cannot validate CI pipeline locally**: GitHub Actions workflows can only be fully validated when running in GitHub. The YAML structure, job dependencies, conditions, and action versions have been reviewed for correctness. Actual CI execution will be validated when code is pushed.
- **Reporter strategy**: Both `e2e-smoke` and `e2e-tests` use `blob` reporter in CI (from the `process.env.CI` config). The smoke job uploads its blob directly (no merge needed for a single run). Only the sharded `e2e-tests` has a merge step.
- **Phase 3 progress**: Task 3.1 complete. Task 3.2 (Phase 3 cleanup) remains.

## Iteration 7 — Task 3.2: Phase 3 cleanup

**Status**: COMPLETED
**Verifier**: PASS — lint, typecheck, and all 21 E2E tests pass (2 verification rounds)
**Reviewer**: APPROVED (one MEDIUM finding fixed in re-review)

### Review of Phase 3 (Task 3.1)

**FAILURE / BLOCKED items**: None. Task 3.1 completed successfully with all checks passing.

**Reviewer caveats from Task 3.1**: One LOW finding (`merge-e2e-reports` skipped guard) was already addressed during Task 3.1 itself. No deferred items.

### Issues Found and Fixed

**Issue 1 (MEDIUM): Accidentally committed blob-report artifact**
- `apps/web/blob-report/report-f59bbac.zip` was committed to git during Task 3.1
- Removed from git tracking via `git rm --cached`
- Added `blob-report/` and `all-blob-reports/` to `apps/web/.gitignore` (alongside existing Playwright entries: `test-results/`, `playwright-report/`, `playwright-screenshots/`, `playwright/.cache/`)

**Issue 2 (LOW): `.github/GITHUB_ACTIONS_SETUP.md` outdated**
- Updated Jobs section from 4 jobs to 6 jobs (added E2E Smoke Tests, E2E Tests with sharding, Merge E2E Reports)
- Added Test Tiers section documenting @smoke (6 tests) and @regression (15 tests) split
- Updated Conditional Execution, Required Status Checks, CI Performance, Download Reports, Run Locally, and Troubleshooting sections
- Removed emoji checkmarks for consistency

**Issue 3 (MEDIUM, from reviewer): Smoke report download instructions inaccurate**
- Original text told users to "Extract and open `index.html` in browser" for the smoke report
- However, the smoke job uploads blob format (not HTML) — there is no merge step for smoke tests
- Fixed: Updated instructions to explain it's a blob report and provide commands to convert to HTML locally (`npx playwright merge-reports --reporter html .`)

### Verification Results

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:e2e` | PASS — 21 tests in 7 files (3.0m) |
| `blob-report/` gitignored | PASS — `git ls-files` returns empty, `git check-ignore` confirms |
| `GITHUB_ACTIONS_SETUP.md` updated | PASS — reflects current CI pipeline |

### Notes

- **No new tasks needed**: All issues from Phase 3 were fixed directly in this cleanup task.
- **Pre-existing out-of-scope issues unchanged**: (1) Dead auth helpers in `helpers/auth.ts`. (2) Hardcoded timeouts in multiple spec files. (3) Hardcoded `http://localhost:8000/api` in 3 spec files. (4) `shared/` directory not included in CI change detection filter (pre-existing).
- **Phase 3 is now complete**. All 2 tasks done, 21 tests passing across 7 files. Ready for Phase 4.

## Iteration 8 — Task 4.1: Full regression check

**Status**: COMPLETED
**Verifier**: PASS — all 7 verification checks pass
**Reviewer**: APPROVED

### Verification Results

| Check | Result | Details |
|-------|--------|---------|
| `pnpm lint` | PASS | All 3 packages (shared, web, api) clean |
| `pnpm typecheck` | PASS | All 3 packages pass `tsc --noEmit` |
| `pnpm test` | PASS | 120 test files, 2391 tests passed (shared: 226, api: 1036, web: 1129) |
| `pnpm test:e2e` | PASS | 21 tests in 7 files (2.8 minutes) |
| `pnpm test:e2e:smoke` | PASS | 6 smoke tests (58.7 seconds) |
| `playwright test --list` | PASS | 21 tests in 7 files confirmed |
| `playwright test --grep @smoke --list` | PASS | 6 smoke tests in 6 files confirmed |

### File Count Verification (7 spec files)

| File | Tests | Smoke | Regression |
|------|-------|-------|------------|
| `auth-journey.spec.ts` | 2 | 1 | 1 |
| `trip-journey.spec.ts` | 6 | 1 | 5 |
| `invitation-journey.spec.ts` | 5 | 1 | 4 |
| `itinerary-journey.spec.ts` | 3 | 1 | 2 |
| `profile-journey.spec.ts` | 2 | 0 | 2 |
| `messaging.spec.ts` | 2 | 1 | 1 |
| `notifications.spec.ts` | 1 | 1 | 0 |
| **Total** | **21** | **6** | **15** |

### Import/Helper Analysis

- **All 7 spec files**: Zero unused imports
- **All helper exports**: Every exported function is used by at least one spec file
- **3 pre-existing orphaned auth helpers**: `authenticateUserWithPhone`, `authenticateUserViaBrowser`, `authenticateUserViaBrowserWithPhone` in `helpers/auth.ts` — confirmed pre-existing (auth.ts not modified on this branch), documented as out-of-scope in iterations 3, 5, 7
- **11 `test.slow()` calls**: All within active test bodies, none orphaned

### Notes

- **No code changes made**: Task 4.1 is purely verification — all checks passed without requiring any fixes.
- **Smoke script location**: `test:e2e:smoke` is defined in `apps/web/package.json` (not root). Invoked via `pnpm --filter @tripful/web test:e2e:smoke` from the devcontainer.
- **Reviewer suggestions (LOW, non-blocking)**: (1) Clean up 3 orphaned auth helpers in a future PR. (2) Consider de-exporting `loginViaBrowser` since it's only used internally.
- **Phase 4 and the E2E Test Simplification project are now complete.** Final state: 21 tests / 7 files (reduced from 32 tests / 9 files), 6 smoke / 15 regression, CI pipeline with PR smoke job + main branch sharded regression + report merging.
