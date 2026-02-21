# Tasks: E2E Test Simplification

## Phase 1: Remove Redundant Tests

- [x] Task 1.1: Delete files and remove individual tests covered by unit tests
  - Implement: Delete `apps/web/tests/e2e/app-shell.spec.ts` (entire file)
  - Implement: Delete `apps/web/tests/e2e/invitation-helpers.spec.ts` (entire file, keep `helpers/invitations.ts`)
  - Implement: Remove `"trip form validation"` test from `apps/web/tests/e2e/trip-journey.spec.ts`
  - Implement: Remove `"itinerary permissions and validation"` test from `apps/web/tests/e2e/itinerary-journey.spec.ts`
  - Implement: Remove `"meetup location and time on event card"` test from `apps/web/tests/e2e/itinerary-journey.spec.ts`
  - Implement: Remove `"multi-day event badge"` test from `apps/web/tests/e2e/itinerary-journey.spec.ts`
  - Implement: Remove `"restricted states journey"` test from `apps/web/tests/e2e/messaging.spec.ts`
  - Implement: Remove `"notification preferences journey"` test from `apps/web/tests/e2e/notifications.spec.ts`
  - Implement: Clean up any orphaned imports in modified files (unused helpers, timeouts, etc.)
  - Verify: `pnpm lint` and `pnpm typecheck` pass (no unused imports/variables)
  - Verify: `pnpm test:e2e` — remaining tests pass, count is 23 (32 - 9 removed, merges not yet done)

- [x] Task 1.2: Merge auth tests and notification tests
  - Implement: In `auth-journey.spec.ts`, merge `"auth guards"` + `"authenticated user redirects away from public pages"` into single `"auth redirects and guards"` test. Combined flow: unauthenticated → redirect to /login → authenticate → existing user skips complete-profile → verify / redirects to /trips → verify /login redirects to /trips. Single `authenticateUser` call.
  - Implement: In `notifications.spec.ts`, merge `"notification bell and dropdown journey"` + `"mark all as read and trip notification bell journey"` into single `"notification flow"` test. Combined flow: setup organizer + member + trip + 2 messages → verify global bell shows unread → click notification → navigate to trip → verify trip bell shows 2 unread → open dialog → mark all as read → verify both global and trip bells show zero.
  - Implement: Clean up any orphaned imports after merges
  - Verify: `pnpm lint` and `pnpm typecheck` pass
  - Verify: `pnpm test:e2e` — all remaining tests pass, count is 21

- [x] Task 1.3: Phase 1 cleanup
  - Review: Read PROGRESS.md entries for Phase 1 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: `pnpm test:e2e` — all 21 tests pass

## Phase 2: Tags and Infrastructure

- [x] Task 2.1: Update smoke/regression tags, optimize helpers, and increase workers
  - Implement: Ensure `@smoke` tag on these 6 tests: `"complete auth journey"`, `"trip CRUD journey"`, `"invitation and RSVP journey"`, `"itinerary CRUD journey"`, `"messaging CRUD journey"`, `"notification flow"` (the merged test)
  - Implement: Add `@regression` tag to all remaining 15 non-smoke tests that don't already have it
  - Implement: Review `test.slow()` calls — ensure no leftover calls from deleted tests, keep on remaining slow tests
  - Implement: In `apps/web/tests/e2e/helpers/invitations.ts`, add optional `inviterCookie?: string` parameter to `inviteAndAcceptViaAPI`. When provided, skip the `createUserViaAPI(request, inviterPhone)` re-auth and use the cookie directly. Falls back to current behavior when omitted.
  - Implement: Update callers that already have the organizer cookie to pass it: `invitation-journey.spec.ts`, `trip-journey.spec.ts`, `messaging.spec.ts`, `notifications.spec.ts`
  - Implement: In `apps/web/playwright.config.ts`, change `workers: process.env.CI ? 2 : 1` to `workers: process.env.CI ? 4 : 1`
  - Implement: Add `"test:e2e:smoke": "playwright test --grep @smoke"` to `apps/web/package.json` scripts
  - Verify: `pnpm lint` and `pnpm typecheck` pass
  - Verify: `pnpm test:e2e` — all 21 tests pass
  - Verify: Confirm `@smoke` grep matches exactly 6 tests (run `pnpm test:e2e:smoke --list` or dry-run)

- [x] Task 2.2: Phase 2 cleanup
  - Review: Read PROGRESS.md entries for Phase 2 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: `pnpm test:e2e` — all 21 tests pass

## Phase 3: CI Pipeline

- [x] Task 3.1: Add CI smoke job, sharding, and report merging
  - Implement: In `.github/workflows/ci.yml`, add `e2e-smoke` job that runs `playwright test --grep @smoke` on PR commits. Needs same postgres service, browser install, and migration steps as existing e2e job. Condition: `github.event_name == 'pull_request'`.
  - Implement: Modify existing `e2e-tests` job to run only on main branch (`github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'`). Add matrix strategy: `shardIndex: [1, 2]`, `shardTotal: [2]`. Pass `--shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}` to playwright command.
  - Implement: Update playwright reporter config in `playwright.config.ts` to use `blob` reporter when `PLAYWRIGHT_SHARD` env var is set (CI sharding), keeping `html` as default for local runs. E.g.: `reporter: process.env.CI ? 'blob' : 'html'`
  - Implement: Add `merge-e2e-reports` job in CI that depends on `e2e-tests`, downloads all blob artifacts, runs `npx playwright merge-reports --reporter html ./all-blob-reports`, and uploads merged HTML report.
  - Verify: `pnpm lint` passes (YAML/config syntax)
  - Verify: `pnpm typecheck` passes
  - Verify: Review CI YAML for correctness (job dependencies, artifact names, conditions)

- [x] Task 3.2: Phase 3 cleanup
  - Review: Read PROGRESS.md entries for Phase 3 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: `pnpm test:e2e` — all 21 tests pass

## Phase 4: Final Verification

- [x] Task 4.1: Full regression check
  - Verify: `pnpm lint` passes
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm test` — all unit/integration tests pass
  - Verify: `pnpm test:e2e` — all 21 E2E tests pass
  - Verify: `pnpm test:e2e:smoke` — exactly 6 smoke tests pass
  - Verify: Confirm file count is 7 spec files (no orphaned files)
  - Verify: Confirm no orphaned imports or unused helpers
