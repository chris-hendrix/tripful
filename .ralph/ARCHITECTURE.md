# Architecture: Notification Task Queue with pg-boss

## Overview

Replace four sequential dispatch patterns (notification member loops, invitation SMS loops, setInterval-based cron jobs) with pg-boss queues. Zero new infrastructure — pg-boss uses the existing PostgreSQL database and auto-creates its own `pgboss` schema.

## Queue Topology

```
notification:batch          Fan-out: resolve members, check prefs, bulk insert, enqueue SMS
notification:deliver        Leaf: send one SMS (retry 3x, exponential backoff, DLQ)
notification:deliver:dlq    Dead letter for failed SMS
invitation:send             Leaf: send one invitation SMS (retry 3x, exponential backoff, DLQ)
invitation:send:dlq         Dead letter for failed invitation SMS
event-reminders             Cron (*/5 * * * *): query upcoming events, enqueue batch jobs
daily-itineraries           Cron (*/15 * * * *): query active trips, enqueue batch jobs
```

## Flow

```
Triggers                          Workers
--------                          -------
messageService.createMessage  --+
invitationService.rsvp        --+
cron: event-reminders         --+---> notification:batch ---> notification:deliver
cron: daily-itineraries       --+
invitationService.create      ------> invitation:send
```

## File Structure

```
apps/api/src/
+-- plugins/
|   +-- queue.ts                          # NEW: pg-boss Fastify plugin
+-- queues/
|   +-- types.ts                          # NEW: queue names, payload interfaces, WorkerDeps
|   +-- index.ts                          # NEW: queue creation, cron schedules, worker registration
|   +-- workers/
|       +-- event-reminders.worker.ts     # NEW: cron handler
|       +-- daily-itineraries.worker.ts   # NEW: cron handler
|       +-- notification-batch.worker.ts  # NEW: fan-out worker
|       +-- notification-deliver.worker.ts # NEW: SMS leaf
|       +-- invitation-send.worker.ts     # NEW: invitation SMS leaf
+-- services/
|   +-- notification.service.ts           # MODIFIED: add boss, simplify notifyTripMembers + createNotification
|   +-- invitation.service.ts             # MODIFIED: add boss, replace SMS loop
|   +-- scheduler.service.ts             # DELETED
+-- plugins/
    +-- notification-service.ts           # MODIFIED: pass boss
    +-- invitation-service.ts             # MODIFIED: pass boss
    +-- scheduler-service.ts             # DELETED
```

## pg-boss Plugin (`plugins/queue.ts`)

Fastify plugin following existing `fp()` pattern. Depends on `["config"]`.

```typescript
import { PgBoss } from "pg-boss";  // v12 uses named exports
import fp from "fastify-plugin";

export default fp(
  async function queuePlugin(fastify: FastifyInstance) {
    const boss = new PgBoss({
      connectionString: fastify.config.DATABASE_URL,
      max: 3,  // Connection pool limit (shares PG with Drizzle)
    });

    boss.on("error", (error) => fastify.log.error(error, "pg-boss error"));

    await boss.start();

    fastify.decorate("boss", boss);
    fastify.addHook("onClose", async () => {
      await boss.stop({ graceful: true });
    });
  },
  { name: "queue", dependencies: ["config"] },
);
```

**Important pg-boss v12 notes:**
- Use named import: `import { PgBoss } from "pg-boss"` (NOT default import)
- `archiveCompletedAfterSeconds` and `deleteAfterSeconds` are queue-level options (passed to `createQueue()`), NOT constructor options
- pg-boss manages its own connection pool separate from Drizzle

## Types (`queues/types.ts`)

```typescript
import type { PgBoss } from "pg-boss";
import type { AppDatabase } from "@/types/index.js";
import type { ISMSService } from "@/services/sms.service.js";
import type { Logger } from "@/types/logger.js";

// Queue name constants
export const QUEUE = {
  NOTIFICATION_BATCH: "notification:batch",
  NOTIFICATION_DELIVER: "notification:deliver",
  NOTIFICATION_DELIVER_DLQ: "notification:deliver:dlq",
  INVITATION_SEND: "invitation:send",
  INVITATION_SEND_DLQ: "invitation:send:dlq",
  EVENT_REMINDERS: "event-reminders",
  DAILY_ITINERARIES: "daily-itineraries",
} as const;

// Payload interfaces
export interface NotificationBatchPayload {
  tripId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  excludeUserId?: string;
}

export interface NotificationDeliverPayload {
  phoneNumber: string;
  message: string;
}

export interface InvitationSendPayload {
  phoneNumber: string;
  message: string;
}

// Worker dependency injection
export interface WorkerDeps {
  db: AppDatabase;
  boss: PgBoss;
  smsService: ISMSService;
  logger: Logger;
}
```

## TypeScript Declarations

In `apps/api/src/types/index.ts`:
- Add `import type { PgBoss } from "pg-boss"`
- Add `boss: PgBoss` to `FastifyInstance`
- Remove `schedulerService: ISchedulerService` and its import

## Worker Registration Plugin (`queues/index.ts`)

`fp()` plugin depending on `["queue", "database", "sms-service"]`. This plugin:
1. Skips registration when `NODE_ENV === "test"` (same guard as existing scheduler)
2. Creates queues with options (retry, backoff, DLQ, expiry)
3. Registers cron schedules for event-reminders and daily-itineraries
4. Registers all workers via `boss.work()`
5. Builds `WorkerDeps` from fastify instance and passes to worker handlers

Queue creation options for delivery queues:
```typescript
await boss.createQueue(QUEUE.NOTIFICATION_DELIVER, {
  retryLimit: 3,
  retryDelay: 10,
  retryBackoff: true,
  expireInSeconds: 300,
  deadLetter: QUEUE.NOTIFICATION_DELIVER_DLQ,
});
```

Cron schedules:
```typescript
await boss.schedule(QUEUE.EVENT_REMINDERS, "*/5 * * * *");
await boss.schedule(QUEUE.DAILY_ITINERARIES, "*/15 * * * *");
```

## Worker Implementations

### Leaf Workers (notification-deliver, invitation-send)

Simple: receive `{ phoneNumber, message }`, call `deps.smsService.sendMessage()`, let errors propagate for pg-boss retry.

```typescript
import type { Job } from "pg-boss";

export async function handleNotificationDeliver(
  job: Job<NotificationDeliverPayload>,
  deps: WorkerDeps,
): Promise<void> {
  const { phoneNumber, message } = job.data;
  await deps.smsService.sendMessage(phoneNumber, message);
}
```

### Batch Worker (notification-batch)

Fan-out logic extracted from `NotificationService.notifyTripMembers()` and scheduler:

1. Query going members for tripId (JOIN members + users for phoneNumber)
2. Filter excluded userId
3. Batch query notification preferences: `WHERE tripId = X AND userId IN (...)`
4. For cron types (event_reminder, daily_itinerary): batch query sentReminders for dedup
5. Build notification records, determine who needs SMS
6. Bulk insert notifications: `db.insert(notifications).values([...])`
7. Bulk insert sentReminders dedup records: `.onConflictDoNothing()`
8. Batch enqueue SMS delivery jobs: `boss.insert([...])`

Helper functions extracted from NotificationService:
- `getPreferenceField(type)`: maps notification type to preference column name
- `shouldSendSms(type, prefs)`: determines if SMS should be sent based on preferences

**Key improvement:** N+1 preference/dedup queries become 2 batched queries.

### Cron Workers (event-reminders, daily-itineraries)

**event-reminders.worker.ts:**
- Extract from `scheduler.service.ts:89-179`
- Query events WHERE `startTime BETWEEN now+55min AND now+65min AND deletedAt IS NULL AND allDay = false`
- Batch query trip names for all found events
- Enqueue `notification:batch` jobs with `singletonKey: "event-reminder:${eventId}"` and `expireInSeconds: 300`

**daily-itineraries.worker.ts:**
- Extract from `scheduler.service.ts:186-321`
- Query active (non-cancelled) trips
- Check if current time in trip's timezone is in 7:45-8:15 AM window
- Check if today (in trip timezone) is within trip date range
- Build daily itinerary body (today's events formatted as list)
- Enqueue `notification:batch` jobs with `singletonKey: "daily-itinerary:${tripId}:${todayStr}"` and `expireInSeconds: 900`

## Service Changes

### NotificationService

- Add optional 3rd constructor param: `private boss: PgBoss | null = null`
- `notifyTripMembers()`: when boss exists, `boss.send('notification:batch', payload)` and return immediately. When boss is null, keep existing member loop as fallback (for tests).
- `createNotification()`: remove `shouldSendSms()` call, phone lookup, and `smsService.sendMessage()` lines 281-295. Method becomes pure DB insert returning `NotificationResult`.
- Remove private methods `shouldSendSms()` and `getPreferenceField()` (logic moved to batch worker helpers).
- Update `plugins/notification-service.ts`: pass `fastify.boss ?? null` as 3rd arg.

### InvitationService

- Add optional 6th constructor param: `private boss: PgBoss | null = null` (after `logger?`)
- `createInvitations()`: replace SMS for-loop (lines 288-291) with `boss.insert()` batch enqueue when boss exists. Keep fallback loop when boss is null.
- Update `plugins/invitation-service.ts`: pass `fastify.boss ?? null` as last arg.

### SchedulerService (DELETE)

- Delete `apps/api/src/services/scheduler.service.ts`
- Delete `apps/api/src/plugins/scheduler-service.ts`
- Remove scheduler import and registration from `apps/api/src/app.ts`
- Remove `schedulerService: ISchedulerService` from type declarations

## Dedup Strategy (Two Layers)

1. **Queue-level**: `singletonKey` on batch jobs prevents duplicate batch processing across cron cycles
2. **Member-level**: `sentReminders` table check inside batch worker prevents duplicate notifications on retry. Uses existing `(type, referenceId, userId)` unique constraint with `.onConflictDoNothing()`.

## App.ts Registration Order

```typescript
// After databasePlugin (line ~84):
await app.register(queuePlugin);              // NEW: pg-boss connection

// ... existing service plugins ...

// Replace schedulerServicePlugin with:
await app.register(queueWorkersPlugin);       // NEW: worker registration (after messageServicePlugin)
```

## Testing Strategy

- **Worker unit tests**: Each worker gets a test file. Workers receive mock `boss` (spy on `insert`/`send`), real DB, `MockSMSService`. Same pattern as existing service tests: real PostgreSQL, `generateUniquePhone()` isolation, cleanup in `afterEach`.
- **Service test updates**: `notification.service.test.ts` — remove assertions expecting `smsService.sendMessage` from `createNotification()`. Add tests for `notifyTripMembers()` with mock boss (verifies `boss.send` called) and without boss (fallback loop). `invitation.service.test.ts` — update SMS dispatch assertions. Test both paths.
- **Scheduler tests**: Delete `scheduler.service.test.ts`, replaced by cron worker tests.
- **Integration/E2E**: Existing tests pass unchanged since queue registration is skipped in test env and services fall back to direct execution.
