# Progress: Notification Task Queue

## Iteration 1 — Task 1.1: Install pg-boss, create queue plugin, types, and TypeScript declarations

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/package.json` | Modified | Added `pg-boss@^12.13.0` dependency |
| `apps/api/src/queues/types.ts` | Created | QUEUE constants (7 names), 3 payload interfaces, WorkerDeps interface |
| `apps/api/src/plugins/queue.ts` | Created | Fastify fp() plugin: PgBoss init, error handler, start/stop lifecycle, decorate |
| `apps/api/src/types/index.ts` | Modified | Added `import type { PgBoss }` and `boss: PgBoss` to FastifyInstance |
| `apps/api/src/app.ts` | Modified | Imported and registered queuePlugin after databasePlugin |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors
- **API tests (`pnpm test`)**: PASS — 989 tests passed across 43 files
- **Web tests**: 8 pre-existing failures unrelated to this task (app-header nav text, trip metadata, URL validation dialogs)

### Reviewer: APPROVED

No blocking issues. All 7 review criteria passed. Two low-priority notes:
- Architecture doc references `AppDatabase` from `@/config/database.js` but implementation correctly uses `@/types/index.js` where it's actually exported
- Logger type uses project's own `Logger` from `@/types/logger.js` instead of pino (matches codebase convention)

### Learnings for Future Iterations

- **pg-boss v12 import**: Must use named import `import { PgBoss } from "pg-boss"` (not default)
- **AppDatabase location**: Exported from `@/types/index.js`, not `@/config/database.js` as architecture doc says
- **Logger type**: Project uses its own `Logger` from `@/types/logger.js`, not pino directly
- **Plugin pattern**: All plugins use `export default fp(async function name(fastify: FastifyInstance) { ... }, { name, dependencies })`
- **Import convention**: Always `@/` alias + `.js` extension for local files; bare specifiers for npm packages
- **Pre-existing web test failures**: 8 tests in web package fail (unrelated to queue work)

## Iteration 2 — Task 1.2: Phase 1 cleanup

**Status: COMPLETED**

### Review Findings

Reviewed all Phase 1 (Task 1.1) PROGRESS.md entries and identified:

- **FAILURES**: None
- **BLOCKED items**: None
- **Deferred items**: None
- **Reviewer caveats**: Two informational notes about ARCHITECTURE.md import path inaccuracies (AppDatabase and Logger). Implementation was already correct; only the planning doc had wrong paths.
- **New FIX tasks needed**: None — all Phase 1 implementation is correct and complete

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `.ralph/ARCHITECTURE.md` | Modified | Fixed `AppDatabase` import path: `@/config/database.js` → `@/types/index.js` |
| `.ralph/ARCHITECTURE.md` | Modified | Fixed `Logger` import path: `pino` → `@/types/logger.js` |

No production code was modified. Only the planning document was corrected to match the actual (correct) implementation.

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors
- **Shared tests**: PASS — 216/216 tests across 12 files
- **API tests (`pnpm test`)**: PASS — 989/989 tests across 43 files
- **Web tests**: 8 pre-existing failures unrelated to this task (1063 passing)

### Reviewer: APPROVED

All four cleanup sub-tasks verified complete:
1. PROGRESS.md entries reviewed thoroughly
2. No FAILURES, BLOCKED, or deferred items found
3. Two architecture doc inaccuracies corrected directly (no FIX tasks needed)
4. Full test suite passed

### Learnings for Future Iterations

- **ARCHITECTURE.md now accurate**: Import paths in Types section match actual implementation
- **Pre-existing web failures stable**: Same 8 tests (app-header nav 5, trip metadata 1, URL validation dialogs 2) — unchanged from iteration 1
- **API test transient flakiness**: Integration tests (`notification.routes`, `auth.routes`) may show transient 503 failures from database connection timing — retrying resolves them

## Iteration 3 — Task 2.1: Create leaf workers (notification-deliver, invitation-send) with unit tests

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/queues/workers/notification-deliver.worker.ts` | Created | Leaf worker: destructures `job.data`, calls `smsService.sendMessage()`, lets errors propagate |
| `apps/api/src/queues/workers/invitation-send.worker.ts` | Created | Leaf worker: same pattern for invitation SMS delivery |
| `apps/api/tests/unit/workers/notification-deliver.worker.test.ts` | Created | Unit tests: success case + error propagation |
| `apps/api/tests/unit/workers/invitation-send.worker.test.ts` | Created | Unit tests: success case + error propagation |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (4 expected `@typescript-eslint/no-explicit-any` warnings in test mock patterns)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 4 tests across 2 files
- **API tests (`pnpm test`)**: PASS — 993 tests passed across 45 files
- **Shared tests**: PASS — 216/216 tests across 12 files
- **Web tests**: 8 pre-existing failures unrelated to this task (1063 passing)

### Reviewer: APPROVED

No blocking issues. All review criteria passed:
1. Architecture compliance — workers match ARCHITECTURE.md spec exactly
2. Type safety — proper generics, no `any` escapes in production code
3. Error handling — no try/catch, errors propagate for pg-boss retry
4. Test quality — both success and error propagation cases covered
5. Code conventions — import style, naming, exports match existing codebase
6. Test isolation — pure unit tests with no database dependency

### Learnings for Future Iterations

- **`Job<T>` import**: Use `import type { Job } from "pg-boss"` directly rather than `PgBoss.Job<T>` — pg-boss exports `PgBoss` as a class (not namespace), so `PgBoss.Job<T>` causes TS2702. The `Job` type is directly exported.
- **Worker pattern**: Workers are named async function exports taking `(job: Job<Payload>, deps: WorkerDeps)`. The registration plugin (Task 3.1) will handle the array-to-single-job adaptation since `boss.work()` passes `Job<T>[]`.
- **Mock WorkerDeps pattern**: `{ db: {} as any, boss: {} as any, smsService: { sendMessage: vi.fn() }, logger: { info: vi.fn(), error: vi.fn() } }` — only mock what the worker uses, stub the rest.
- **API test count grew**: From 989 (iteration 1) to 993 (4 new worker tests added)
- **New directories created**: `apps/api/src/queues/workers/` and `apps/api/tests/unit/workers/` — future worker tasks can place files here directly

## Iteration 4 — Task 2.2: Create notification-batch worker with unit tests

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/queues/workers/notification-batch.worker.ts` | Created | Fan-out batch worker: resolves members, checks prefs, dedup for cron types, bulk inserts notifications + sentReminders, batch enqueues SMS |
| `apps/api/tests/unit/workers/notification-batch.worker.test.ts` | Created | 22 tests: helper function unit tests (9), integration tests with real DB (13) |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (6 acceptable `@typescript-eslint/no-explicit-any` warnings in test mocks)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 26 tests across 3 files (22 new + 4 existing)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1015 tests across 46 files (no regressions)

### Reviewer: APPROVED

All 10 review criteria passed:
1. Architecture compliance — worker matches ARCHITECTURE.md spec exactly (8 steps: member resolution, exclude filtering, batch preferences, dedup, notification insert, sentReminders insert, SMS enqueue)
2. Type safety — zero `any` in production code, proper generics for Job<NotificationBatchPayload>
3. Error handling — no try-catch, errors propagate for pg-boss retry
4. Query efficiency — 3 batched queries replace N+1 pattern from original notifyTripMembers()
5. Code conventions — @/ alias + .js extensions, naming matches codebase
6. Helper function correctness — getPreferenceField() and shouldSendSms() match original notification.service.ts logic exactly
7. Test coverage — all required scenarios covered (member resolution, prefs, dedup, SMS enqueue, excludeUserId)
8. Test quality — real DB, mock boss spy, generateUniquePhone() isolation, proper FK-ordered cleanup
9. Dedup correctness — sentReminders checked/inserted only for cron types (event_reminder, daily_itinerary)
10. SMS message format — `${title}: ${body}` matches original

Three non-blocking suggestions noted (LOW priority): `as any` in test mocks consistent with existing pattern, redundant cleanup is defensive, `type` parameter could be narrowed but matches shared types.

### Learnings for Future Iterations

- **Batch worker DB test pattern**: Use real DB with `generateUniquePhone()` isolation, mock only `boss` (spy on `insert`), cleanup in FK order: sentReminders → notifications → notificationPreferences → members → trips → users
- **Default preferences**: When no notificationPreferences row exists for a (userId, tripId), default to `{ eventReminders: true, dailyItinerary: true, tripMessages: true }` — matches getPreferences() behavior in notification.service.ts
- **Cron type identification**: `event_reminder` and `daily_itinerary` are the two cron types that need sentReminders dedup. `trip_update` and `trip_message` are real-time and skip dedup.
- **referenceId for dedup**: Passed via `data.referenceId` in the batch payload. Cron workers (Task 2.3) will set this when enqueuing batch jobs.
- **boss.insert() batch API**: `boss.insert(queueName, [{ data: payload }, ...])` — takes an array of JobInsert objects
- **API test count**: From 993 (iteration 3) to 1015 (22 new batch worker tests added)
- **Helper functions exported**: `getPreferenceField()` and `shouldSendSms()` are exported from the worker file for testability — future Task 4.1 can remove the private methods from NotificationService

## Iteration 5 — Task 2.3: Create cron workers (event-reminders, daily-itineraries) with unit tests

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/queues/workers/event-reminders.worker.ts` | Created | Cron worker: queries events in 55-65 min window (non-deleted, non-allDay), batch queries trip names via inArray, enqueues notification:batch jobs with singletonKey |
| `apps/api/src/queues/workers/daily-itineraries.worker.ts` | Created | Cron worker: queries active trips, checks timezone morning window (7:45-8:15 AM), date range, builds event body, enqueues notification:batch jobs with singletonKey |
| `apps/api/tests/unit/workers/event-reminders.worker.test.ts` | Created | 13 tests: event window, allDay skip, deleted skip, location in body, trip name resolution, multiple events, singletonKey, referenceId, boundary tests |
| `apps/api/tests/unit/workers/daily-itineraries.worker.test.ts` | Created | 19 tests: timezone window, cancelled/dateless trip skip, date range, event body formatting, empty events, deleted event exclusion, singletonKey, referenceId, boundary tests (7:44/7:45/8:15/8:16) |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (27 acceptable `@typescript-eslint/no-explicit-any` warnings in test mocks)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 58 tests across 5 files (13 event-reminders + 19 daily-itineraries + 22 notification-batch + 2 notification-deliver + 2 invitation-send)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1047 tests across 48 files
- **Web tests**: 8 pre-existing failures unrelated to this task (1063 passing)

### Reviewer: APPROVED

All 10 review criteria passed:
1. Architecture compliance — workers query DB and enqueue batch jobs only; no member resolution, preference checking, or notification creation
2. Type safety — zero `any` in production code, `Job<object>` for cron jobs (pg-boss sends `{}`)
3. Error handling — no try-catch, errors propagate for pg-boss retry
4. Query correctness — event window (55-65 min), daily itinerary timezone morning window (7:45-8:15), date range checks match scheduler.service.ts exactly
5. Code conventions — `@/` alias + `.js` extensions, named exports, consistent with existing workers
6. Payload correctness — `data.referenceId` included for batch worker dedup, singletonKey format matches architecture spec, expireInSeconds correct (300/900)
7. Test quality — all TASKS.md scenarios covered plus boundary tests
8. Test isolation — `vi.useFakeTimers()`/`vi.useRealTimers()` in before/afterEach, `generateUniquePhone()` for user isolation, proper FK-ordered cleanup
9. Batch trip query — event-reminders uses `inArray(trips.id, tripIds)` with Map, eliminating N+1
10. Daily itinerary body — numbered list with `h:mm a` format and "No events scheduled for today." when empty, matching scheduler.service.ts exactly

Three non-blocking LOW suggestions noted: shared `createMockDeps()` helper, structured logging parity for daily-itineraries worker, and in-memory event date filtering (faithful to original scheduler).

### Learnings for Future Iterations

- **Cron job `Job<object>` type**: pg-boss sends `{}` as cron payload. Use `Job<object>` (not `Job<void>`) and prefix parameter with underscore: `_job: Job<object>`
- **`boss.send()` for cron->batch enqueue**: `boss.send(queueName, data, options)` where options includes `singletonKey` and `expireInSeconds` — distinct from `boss.insert()` which takes array for batch
- **Batch trip name lookup**: Use `inArray(trips.id, tripIds)` + Map for O(1) lookups, replacing N+1 queries from original scheduler
- **vi.useFakeTimers pattern for timezone tests**: Set system time to a known UTC instant, configure trip with timezone, assert morning window detection. Must call `vi.useRealTimers()` in afterEach to avoid affecting DB operations
- **Cleanup order with events**: events → members → trips → users (events FK→trips via tripId, events FK→users via createdBy)
- **Events table requires**: `createdBy` (FK users), `eventType` (enum: 'travel', 'meal', 'activity'), and `startTime` (timestamp tz, NOT NULL)
- **API test count**: From 1015 (iteration 4) to 1047 (32 new cron worker tests added)
- **Pre-existing web failures**: Same 8 tests unchanged from previous iterations
- **Unused variable lint error**: When `createTrip()` return value is not needed, call without assignment to avoid `@typescript-eslint/no-unused-vars` error

## Iteration 6 — Task 2.4: Phase 2 cleanup

**Status: COMPLETED**

### Review Findings

Reviewed all Phase 2 (Tasks 2.1, 2.2, 2.3) PROGRESS.md entries and identified:

- **FAILURES**: None
- **BLOCKED items**: None
- **Deferred items**: None
- **Reviewer caveats assessed** (6 total across Tasks 2.2 and 2.3):
  1. `as any` in test mocks — Standard DI mock pattern for WorkerDeps, not practical to eliminate without shared typed factory. No action needed.
  2. Redundant cleanup in batch worker test — Defensive pattern preventing flaky tests. No action needed.
  3. Type parameter narrowing for NotificationBatchPayload.type — Breaking change to shared types, future enhancement. No action needed.
  4. Shared `createMockDeps()` helper — Low value since each test needs different mock shape. No action needed.
  5. Structured logging parity for daily-itineraries — **Fixed directly** (see changes below).
  6. In-memory event date filtering — Faithful to original scheduler, correct approach. No action needed.
- **New FIX tasks needed**: None — all Phase 2 implementation is correct and complete

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `.ralph/ARCHITECTURE.md` | Modified | Fixed code sample: `PgBoss.Job<T>` → `Job<T>` with proper `import type { Job } from "pg-boss"` line |
| `apps/api/src/queues/workers/daily-itineraries.worker.ts` | Modified | Added `enqueuedCount` counter, structured logging `{ count }` for parity with event-reminders worker |
| `apps/api/tests/unit/workers/daily-itineraries.worker.test.ts` | Modified | Updated log assertion to match new structured format: `({ count: 1 }, "enqueued daily itinerary batches")` |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (27 `@typescript-eslint/no-explicit-any` warnings in worker test files — warnings only)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 58 tests across 5 files
- **Full API test suite**: PASS — 1047 tests across 48 files (no regressions)
- **Shared tests**: PASS — 216/216 tests across 12 files
- **Web tests**: 8 pre-existing failures unrelated to queue work (1063 passing)

### Reviewer: APPROVED

All cleanup sub-tasks verified complete:
1. PROGRESS.md entries reviewed thoroughly for all Phase 2 tasks
2. No FAILURES, BLOCKED, or deferred items found
3. Six reviewer caveats assessed: one fixed directly (structured logging), five justified as no-action
4. Two documentation/code fixes correct and consistent with codebase patterns
5. Full test suite passed with no regressions

Two non-blocking observations noted:
- [LOW] daily-itineraries logs `{ count: 0 }` when no trips qualify (always reaches log), while event-reminders early-returns and never logs when empty — acceptable behavioral difference for better operational observability
- [LOW] Single-line vs multi-line format for structured log call — trivial formatting difference

### Learnings for Future Iterations

- **ARCHITECTURE.md now fully accurate**: All code samples match actual implementation (Job import, worker signatures)
- **Structured logging convention**: Workers should use `deps.logger.info({ count }, "description")` pattern for observability
- **Phase 2 complete**: All 5 workers (2 leaf, 1 batch, 2 cron) implemented with 58 total tests, ready for Phase 3 worker registration
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 6 iterations
- **API test count stable**: 1047 tests (unchanged from iteration 5 — cleanup added no new tests)

## Iteration 7 — Task 3.1: Create worker registration plugin with queue creation and cron schedules

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/queues/index.ts` | Created | fp() plugin: creates 7 queues (DLQs first), registers 2 cron schedules, registers 5 workers with WorkerDeps, guarded by NODE_ENV !== "test" |
| `apps/api/src/app.ts` | Modified | Imported and registered queueWorkersPlugin after messageServicePlugin, before schedulerServicePlugin |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (27 pre-existing `@typescript-eslint/no-explicit-any` warnings in test files)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 58 tests across 5 files
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1047 tests across 48 files (no regressions)
- **Web tests**: 8 pre-existing failures unrelated to this task

### Reviewer: APPROVED

All 10 review criteria passed:
1. Architecture compliance — matches ARCHITECTURE.md spec exactly
2. Type safety — zero `any` in production code, proper generics on all `boss.work<T>()` calls
3. pg-boss v12 API correctness — uses `localConcurrency` (not `teamSize`), `pollingIntervalSeconds` (not `newJobCheckInterval`), `deleteAfterSeconds` (not `archiveCompletedAfterSeconds`)
4. Queue creation order — DLQ queues created before parent queues that reference them
5. Worker handler wrapping — `async (jobs) => { await handler(jobs[0]!, deps); }` adapts Job[] to single Job
6. Cron schedule correctness — `*/5 * * * *` (event-reminders), `*/15 * * * *` (daily-itineraries)
7. Test guard — early return when `NODE_ENV === "test"`
8. Import conventions — relative `.js` imports within queues/, `./queues/index.js` from app.ts
9. Plugin registration order — after messageServicePlugin (line 184), before schedulerServicePlugin (line 186)
10. WorkerDeps construction — correctly maps `fastify.db`, `fastify.boss`, `fastify.smsService`, `fastify.log`

Two non-blocking LOW suggestions noted:
- Debug-level log on early return in test mode for troubleshooting aid
- Parallel queue creation for DLQ-independent queues (micro-optimization, negligible benefit)

### Learnings for Future Iterations

- **pg-boss v12 `work()` receives Job[] array**: Handler signature is `(jobs: Job<T>[]) => Promise<void>`. Use `jobs[0]!` with non-null assertion (safe since `batchSize` defaults to 1) rather than array destructuring `([job])` which TypeScript strict mode treats as potentially undefined
- **pg-boss v12 renamed options**: `teamSize` → `localConcurrency`, `newJobCheckInterval` → `pollingIntervalSeconds`, `archiveCompletedAfterSeconds` → `deleteAfterSeconds`
- **DLQ creation order matters**: Dead letter queues must exist before `createQueue()` references them in the `deadLetter` option
- **`boss.schedule()` is idempotent**: Safe to call on every startup — updates existing schedules
- **`boss.createQueue()` is idempotent**: Internally uses CREATE TABLE IF NOT EXISTS pattern
- **Plugin name**: `"queue-workers"` (distinct from `"queue"` which is the pg-boss lifecycle plugin)
- **No new tests needed**: Plugin is fully guarded by NODE_ENV check; test suite count unchanged at 1047
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 7 iterations
- **Phase 3 worker registration started**: Queue infrastructure now complete — queues created, cron scheduled, workers registered. Next task is Phase 3 cleanup.

## Iteration 8 — Task 3.2: Phase 3 cleanup

**Status: COMPLETED**

### Review Findings

Reviewed all Phase 3 (Task 3.1) PROGRESS.md entries and identified:

- **FAILURES**: None
- **BLOCKED items**: None
- **Deferred items**: None
- **Reviewer caveats assessed** (2 from Iteration 7, both LOW):
  1. Silent early return in test mode — **Fixed directly** (debug log added for observability)
  2. Parallel queue creation for DLQ-independent queues — No action needed. Micro-optimization with negligible startup-time benefit; sequential execution is more readable and clearly shows DLQ dependency ordering.
- **Architecture doc gap**: ARCHITECTURE.md queue creation code sample was missing `deleteAfterSeconds: 604800` — **Fixed directly**
- **New FIX tasks needed**: None — all Phase 3 implementation is correct and complete

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/queues/index.ts` | Modified | Added `fastify.log.debug("queue workers skipped in test environment")` before early return in test guard |
| `.ralph/ARCHITECTURE.md` | Modified | Added `deleteAfterSeconds: 604800` to queue creation code sample to match actual implementation |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (27 `@typescript-eslint/no-explicit-any` warnings in worker test files — warnings only)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1047 tests across 48 files (no regressions)
- **Shared tests**: PASS — 216/216 tests across 12 files
- **Web tests**: 8 pre-existing failures unrelated to queue work (1063 passing)

### Reviewer: APPROVED

All cleanup sub-tasks verified complete:
1. PROGRESS.md entries reviewed thoroughly for Phase 3 (Iteration 7 only)
2. No FAILURES, BLOCKED, or deferred items found
3. Two reviewer caveats assessed: one fixed directly (debug log), one justified as no-action (parallel queue creation)
4. Architecture doc gap fixed (deleteAfterSeconds added to code sample)
5. Full test suite passed with no regressions
6. No new FIX tasks needed

### Learnings for Future Iterations

- **ARCHITECTURE.md now fully accurate**: Queue creation code sample matches implementation including `deleteAfterSeconds`
- **Debug logging convention for test guards**: `fastify.log.debug("... skipped in test environment")` provides visibility when troubleshooting without affecting production or test output
- **Phase 3 complete**: Worker registration plugin fully implemented and cleaned up. Queue infrastructure is ready: 7 queues created, 2 cron schedules registered, 5 workers registered with proper concurrency/polling options
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 8 iterations
- **API test count stable**: 1047 tests (unchanged — cleanup added no new tests)
- **Next phase**: Phase 4 (Service Refactoring) — refactor NotificationService and InvitationService to use pg-boss, then remove SchedulerService

## Iteration 9 — Task 4.1: Refactor NotificationService and InvitationService to use pg-boss with updated tests

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/services/notification.service.ts` | Modified | Added `boss: PgBoss \| null = null` as optional 3rd constructor param. `notifyTripMembers()` delegates to `QUEUE.NOTIFICATION_BATCH` when boss exists, falls back to inline loop when null. `createNotification()` simplified to pure DB insert (SMS removed). Deleted private `shouldSendSms()` and `getPreferenceField()` methods. |
| `apps/api/src/plugins/notification-service.ts` | Modified | Pass `fastify.boss ?? null` as 3rd arg. Added `"queue"` to dependencies. |
| `apps/api/src/services/invitation.service.ts` | Modified | Added `boss: PgBoss \| null = null` as optional 6th constructor param (after logger). `createInvitations()` uses `boss.insert(QUEUE.INVITATION_SEND, ...)` when boss exists, falls back to inline SMS loop when null. |
| `apps/api/src/plugins/invitation-service.ts` | Modified | Pass `fastify.boss ?? null` as last arg. Added `"queue"` to dependencies. |
| `apps/api/src/plugins/queue.ts` | Modified | Decorates `boss: null` in test environment to avoid connection pool exhaustion. |
| `apps/api/src/types/index.ts` | Modified | Changed `boss: PgBoss` to `boss: PgBoss \| null` in FastifyInstance declaration. |
| `apps/api/src/queues/index.ts` | Modified | Added null guard for boss after early return for test env. |
| `apps/api/tests/unit/notification.service.test.ts` | Modified | Updated createNotification tests to expect pure DB insert (no SMS). Renamed notifyTripMembers describe to "fallback without boss". Added new "with boss queue" describe block testing boss.send with correct payload. |
| `apps/api/tests/unit/invitation.service.test.ts` | Modified | Added "with boss queue" describe testing boss.insert with correct payload. Added "fallback without boss" describe testing inline SMS loop. |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (32 `@typescript-eslint/no-explicit-any` warnings in test files — warnings only)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1051 tests across 48 files (4 new tests added)
- **Worker tests (`cd apps/api && pnpm vitest run tests/unit/workers/`)**: PASS — 58 tests across 5 files
- **Notification service tests**: PASS — 34 tests in 1 file
- **Invitation service tests**: PASS — 37 tests in 1 file
- **Web tests**: 8 pre-existing failures unrelated to this task (1063 passing)

### Reviewer: APPROVED

All 10 review criteria passed:
1. Architecture compliance — services match ARCHITECTURE.md spec exactly
2. Type safety — no `any` in production code, proper PgBoss typing with null union
3. Fallback paths — both services work correctly with boss = null
4. Import conventions — `@/` alias + `.js` extensions, type imports for PgBoss
5. Plugin wiring — correct constructor args, `"queue"` in dependencies
6. Test quality — both boss path (enqueue) and fallback path covered with correct payload assertions
7. No dead code — `shouldSendSms()` and `getPreferenceField()` removed from NotificationService
8. Queue type changes — `PgBoss | null` on FastifyInstance, WorkerDeps.boss remains non-null
9. SMS removal from createNotification — no callers depend on inline SMS behavior
10. Payload shapes — boss.send uses NotificationBatchPayload, boss.insert uses InvitationSendPayload

Two non-blocking LOW observations:
- `_smsService` parameter kept in NotificationService for constructor API compatibility (unused but harmless)
- `as any` in test mock boss objects — standard practice for partial mocks

### Learnings for Future Iterations

- **boss: PgBoss | null pattern**: The FastifyInstance `boss` type is now `PgBoss | null`. In test environments, the queue plugin decorates `null` to avoid connection pool exhaustion. Services use `this.boss?.send()` or explicit null checks.
- **Queue plugin test guard**: `queue.ts` now returns early with `decorate("boss", null)` in test env, rather than trying to connect pg-boss. This prevents database connection issues in parallel test runs.
- **queues/index.ts null guard**: The worker registration plugin now checks `if (!fastify.boss)` after the NODE_ENV test guard, providing TypeScript narrowing for the rest of the function.
- **createNotification is now pure DB insert**: No more SMS from `createNotification()`. SchedulerService (being removed in Task 4.2) still calls it, but inline SMS is no longer needed since cron workers handle batch notifications.
- **Test count**: From 1047 (iteration 8) to 1051 (4 new tests: 2 notification boss path + 2 invitation boss/fallback)
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 9 iterations
- **Next task**: Task 4.2 — Remove SchedulerService and delete old scheduler tests

## Iteration 10 — Task 4.2: Remove SchedulerService and delete old scheduler tests

**Status: COMPLETED**

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/services/scheduler.service.ts` | Deleted | 391-line SchedulerService class and ISchedulerService interface |
| `apps/api/src/plugins/scheduler-service.ts` | Deleted | 38-line Fastify fp() plugin that instantiated and registered the scheduler |
| `apps/api/tests/unit/scheduler.service.test.ts` | Deleted | 831-line test suite (21 tests) — replaced by cron worker tests |
| `apps/api/src/app.ts` | Modified | Removed schedulerServicePlugin import (line 33) and registration (line 186) |
| `apps/api/src/types/index.ts` | Modified | Removed ISchedulerService import (line 19) and `schedulerService` property from FastifyInstance (line 65) |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (32 `@typescript-eslint/no-explicit-any` warnings in test files — pre-existing)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1030 tests across 47 files (down from 1051/48 — 21 scheduler tests removed)
- **Scheduler reference grep**: PASS — zero matches for `SchedulerService`, `ISchedulerService`, `schedulerService`, `scheduler-service`, or `schedulerServicePlugin` in `apps/api/src/`
- **Deleted files confirmed**: All 3 files no longer exist on disk

### Reviewer: APPROVED

All review criteria passed:
1. **Completeness**: All scheduler references removed from source code (zero grep matches)
2. **Clean edits**: app.ts and types/index.ts properly formatted after removal — no extra blank lines, no dangling commas
3. **No side effects**: queueWorkersPlugin (already registered at line 184) fully replaces scheduler functionality
4. **Plugin registration order**: Correct — queueWorkersPlugin registered after all its dependencies
5. **Type declarations**: FastifyInstance augmentation properly formatted with `healthService` as last entry
6. **Test coverage preserved**: Old 24 scheduler tests replaced by 33 cron worker tests (14 event-reminders + 19 daily-itineraries) with better boundary and timezone coverage

No issues found. No NEEDS_WORK items.

### Learnings for Future Iterations

- **Clean removal pattern**: Deletion of a Fastify service requires changes in exactly 4 places: service file, plugin file, app.ts (import + register), types/index.ts (import + type declaration)
- **Test count**: From 1051 (iteration 9) to 1030 (21 scheduler tests removed). Worker tests already existed from Phase 2, providing equivalent+ coverage.
- **VERIFICATION.md Key Point #5 satisfied**: "Scheduler fully removed: No references to SchedulerService, scheduler-service plugin, or setInterval patterns remain after Phase 4"
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 10 iterations
- **Phase 4 progress**: Task 4.1 (service refactoring) and Task 4.2 (scheduler removal) complete. Next: Task 4.3 (Phase 4 cleanup)
- **Documentation references intentionally preserved**: Historical docs under `docs/2026-02-14-messaging-notifications/` still reference SchedulerService — this is expected as they document the pre-migration architecture

## Iteration 11 — Task 4.3: Phase 4 cleanup

**Status: COMPLETED**

### Review Findings

Reviewed all Phase 4 (Tasks 4.1 and 4.2) PROGRESS.md entries and identified:

- **FAILURES**: None
- **BLOCKED items**: None
- **Deferred items**: None
- **Reviewer caveats assessed** (3 total across Tasks 4.1 and 4.2):
  1. `_smsService` parameter in NotificationService is dead code — **Fixed directly** (see changes below)
  2. `as any` in test mock boss objects — Standard practice for partial mocks. No action needed.
  3. All Task 4.2 criteria passed with no issues — No action needed.
- **New FIX tasks needed**: None — all Phase 4 implementation is correct and complete

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/services/notification.service.ts` | Modified | Removed `_smsService: ISMSService` constructor parameter (dead code) and `ISMSService` import. Constructor now `(db: AppDatabase, boss: PgBoss \| null = null)` |
| `apps/api/src/plugins/notification-service.ts` | Modified | Removed `fastify.smsService` from constructor call, removed `"sms-service"` from dependencies array, removed `@depends sms-service` JSDoc line |
| `apps/api/tests/unit/notification.service.test.ts` | Modified | Removed `MockSMSService` import and `smsService` variable. Updated all `new NotificationService(db, smsService...)` calls. Removed 2 vacuous tests that spied on disconnected mock |
| `apps/api/tests/unit/invitation.service.test.ts` | Modified | Updated `new NotificationService(db, smsService)` to `new NotificationService(db)`. `smsService` retained for InvitationService which still uses it |
| `.ralph/ARCHITECTURE.md` | Modified | Updated NotificationService section: "3rd constructor param" → "2nd constructor param", "3rd arg" → "2nd arg", added note about sms-service dependency removal |

### Verification Results

- **TypeScript (`pnpm typecheck`)**: PASS — 0 errors across all 3 packages (api, web, shared)
- **Linting (`pnpm lint`)**: PASS — 0 errors (32 `@typescript-eslint/no-explicit-any` warnings in test files — pre-existing)
- **Full API test suite (`cd apps/api && pnpm vitest run`)**: PASS — 1028 tests across 47 files (down from 1030/47 — 2 vacuous tests removed)
- **Grep verification**: Zero matches for `ISMSService`, `_smsService`, `MockSMSService`, or `smsService` in notification.service.ts and notification-service.ts

### Reviewer: APPROVED

All cleanup sub-tasks verified complete:
1. PROGRESS.md entries reviewed thoroughly for Phase 4 (Iterations 9 and 10)
2. No FAILURES, BLOCKED, or deferred items found
3. Three reviewer caveats assessed: one fixed directly (`_smsService` dead code removal), two justified as no-action
4. No new FIX tasks needed
5. Full test suite passed with no regressions
6. ARCHITECTURE.md updated to match current state

One non-blocking LOW observation: ARCHITECTURE.md stale constructor param numbering — **Fixed directly** in this iteration.

### Learnings for Future Iterations

- **Dead code removal pattern**: When removing a constructor parameter, update: service file (param + import), plugin file (constructor call + dependencies + JSDoc), and all test files constructing the service
- **Vacuous test identification**: After refactoring, check if spy-based tests are still connected to the code under test. Spying on a mock that is never wired into the service produces tautological "not called" assertions.
- **Plugin dependency cleanup**: When a service no longer needs a dependency, remove it from the dependencies array — the Fastify plugin registration order is maintained by other plugins that still declare the dependency.
- **Test count**: From 1030 (iteration 10) to 1028 (2 vacuous tests removed)
- **Pre-existing web failures stable**: Same 8 tests unchanged across all 11 iterations
- **Phase 4 complete**: All service refactoring, scheduler removal, and cleanup done. Ready for Phase 5 (Final Verification)
