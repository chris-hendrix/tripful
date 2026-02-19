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
