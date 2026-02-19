# Tasks: Notification Task Queue with pg-boss

## Phase 1: Infrastructure

- [x] Task 1.1: Install pg-boss, create queue plugin, types, and TypeScript declarations
  - Implement: `pnpm add pg-boss --filter @tripful/api`
  - Implement: Create `apps/api/src/queues/types.ts` with QUEUE constants (7 queue names), payload interfaces (NotificationBatchPayload, NotificationDeliverPayload, InvitationSendPayload), and WorkerDeps interface
  - Implement: Create `apps/api/src/plugins/queue.ts` as fp() plugin depending on ["config"]. Init PgBoss with connectionString and max:3. Add error handler, boss.start(), onClose -> boss.stop({ graceful: true }). Decorate fastify.boss
  - Implement: In `apps/api/src/types/index.ts` — add `import type { PgBoss } from "pg-boss"`, add `boss: PgBoss` to FastifyInstance
  - Implement: In `apps/api/src/app.ts` — import queuePlugin, register after databasePlugin
  - Verify: `pnpm typecheck` passes

- [x] Task 1.2: Phase 1 cleanup
  - Review: Read PROGRESS.md entries for Phase 1 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 2: Workers

- [x] Task 2.1: Create leaf workers (notification-deliver, invitation-send) with unit tests
  - Implement: Create `apps/api/src/queues/workers/notification-deliver.worker.ts` — handleNotificationDeliver(job, deps) calls smsService.sendMessage(phoneNumber, message), lets errors propagate for pg-boss retry
  - Implement: Create `apps/api/src/queues/workers/invitation-send.worker.ts` — handleInvitationSend(job, deps) calls smsService.sendMessage(phoneNumber, message), lets errors propagate
  - Test: Create `apps/api/tests/unit/workers/notification-deliver.worker.test.ts` — test SMS send success, error propagation
  - Test: Create `apps/api/tests/unit/workers/invitation-send.worker.test.ts` — test SMS send success, error propagation
  - Verify: `pnpm typecheck` and `pnpm test -- tests/unit/workers/` pass

- [x] Task 2.2: Create notification-batch worker with unit tests
  - Implement: Create `apps/api/src/queues/workers/notification-batch.worker.ts`
  - Implement: handleNotificationBatch(job, deps) — query going members with phoneNumber, filter excludeUserId, batch query prefs, batch query sentReminders for cron types, build notification+SMS+dedup arrays, bulk insert notifications, bulk insert sentReminders (onConflictDoNothing), batch enqueue SMS via boss.insert()
  - Implement: Extract getPreferenceField() and shouldSendSms() as helper functions (reuse logic from notification.service.ts:454-496)
  - Test: Create `apps/api/tests/unit/workers/notification-batch.worker.test.ts` — test member resolution, preference filtering, dedup for cron types, SMS enqueue, excludeUserId filtering. Use mock boss (spy insert/send), real DB, MockSMSService
  - Verify: `pnpm typecheck` and `pnpm test -- tests/unit/workers/` pass

- [x] Task 2.3: Create cron workers (event-reminders, daily-itineraries) with unit tests
  - Implement: Create `apps/api/src/queues/workers/event-reminders.worker.ts` — extract event query logic from scheduler.service.ts:89-179 (55-65 min window, non-deleted, non-allDay). Batch query trip names. Enqueue notification:batch jobs with singletonKey "event-reminder:${eventId}" and expireInSeconds 300
  - Implement: Create `apps/api/src/queues/workers/daily-itineraries.worker.ts` — extract trip query + timezone/morning window check from scheduler.service.ts:186-321. Build daily itinerary body. Enqueue notification:batch jobs with singletonKey "daily-itinerary:${tripId}:${todayStr}" and expireInSeconds 900
  - Test: Create `apps/api/tests/unit/workers/event-reminders.worker.test.ts` — test event query window, batch enqueue with singletonKey, skipping allDay events
  - Test: Create `apps/api/tests/unit/workers/daily-itineraries.worker.test.ts` — test timezone window, event body building, batch enqueue
  - Verify: `pnpm typecheck` and `pnpm test -- tests/unit/workers/` pass

- [x] Task 2.4: Phase 2 cleanup
  - Review: Read PROGRESS.md entries for Phase 2 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 3: Worker Registration

- [x] Task 3.1: Create worker registration plugin with queue creation and cron schedules
  - Implement: Create `apps/api/src/queues/index.ts` as fp() plugin depending on ["queue", "database", "sms-service"]
  - Implement: Guard with NODE_ENV !== "test" (skip worker registration in tests)
  - Implement: Create queues with options — notification:deliver and invitation:send with retryLimit:3, retryDelay:10, retryBackoff:true, expireInSeconds:300, dead letter queues. Also archiveCompletedAfterSeconds:3600 and deleteAfterSeconds:604800 as queue-level options
  - Implement: Register cron schedules — event-reminders (*/5 * * * *), daily-itineraries (*/15 * * * *)
  - Implement: Register all workers via boss.work() — cron workers with longer poll intervals, delivery workers with teamSize:3
  - Implement: Build WorkerDeps from fastify instance, pass to worker handlers
  - Implement: In `apps/api/src/app.ts` — import queueWorkersPlugin, register after messageServicePlugin (replaces schedulerServicePlugin position but don't remove scheduler yet)
  - Verify: `pnpm typecheck` passes

- [x] Task 3.2: Phase 3 cleanup
  - Review: Read PROGRESS.md entries for Phase 3 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 4: Service Refactoring

- [x] Task 4.1: Refactor NotificationService and InvitationService to use pg-boss with updated tests
  - Implement: In notification.service.ts — add optional 3rd constructor param `boss: PgBoss | null = null`. Simplify notifyTripMembers(): when boss exists, boss.send('notification:batch', payload) and return; keep existing loop as fallback. Simplify createNotification(): remove shouldSendSms() call, phone lookup, smsService.sendMessage() (lines 281-295), making it a pure DB insert. Remove private shouldSendSms() and getPreferenceField() methods.
  - Implement: Update plugins/notification-service.ts — pass `fastify.boss ?? null` as 3rd constructor arg
  - Implement: In invitation.service.ts — add optional 6th constructor param `boss: PgBoss | null = null` (after logger). In createInvitations(): replace SMS for-loop (lines 288-291) with boss.insert() batch enqueue when boss exists; keep fallback loop when null.
  - Implement: Update plugins/invitation-service.ts — pass `fastify.boss ?? null` as last constructor arg
  - Test: Update notification.service.test.ts — remove/update assertions expecting smsService.sendMessage from createNotification(). Add tests for notifyTripMembers() with mock boss (verify boss.send called with correct payload) and without boss (fallback loop)
  - Test: Update invitation.service.test.ts — update SMS dispatch assertions. Add tests for boss path (verify boss.insert called) and fallback path
  - Verify: `pnpm typecheck` and `pnpm test` pass

- [x] Task 4.2: Remove SchedulerService and delete old scheduler tests
  - Implement: Delete `apps/api/src/services/scheduler.service.ts`
  - Implement: Delete `apps/api/src/plugins/scheduler-service.ts`
  - Implement: In `apps/api/src/app.ts` — remove scheduler plugin import and registration
  - Implement: In `apps/api/src/types/index.ts` — remove `schedulerService: ISchedulerService` and its import
  - Implement: Delete `apps/api/tests/unit/scheduler.service.test.ts` (replaced by cron worker tests)
  - Implement: Verify no other files import or reference scheduler service
  - Verify: `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass

- [x] Task 4.3: Phase 4 cleanup
  - Review: Read PROGRESS.md entries for Phase 4 tasks
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items
  - Fix: Create new tasks in TASKS.md for any outstanding issues
  - Verify: run full test suite

## Phase 5: Final Verification

- [ ] Task 5.1: Full regression check
  - Verify: `pnpm typecheck` — all packages compile
  - Verify: `pnpm lint` — no linting errors
  - Verify: `pnpm test` — all unit + integration tests pass
  - Verify: `pnpm test:e2e` — E2E tests pass (services use fallback path in test env)
