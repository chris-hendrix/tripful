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
