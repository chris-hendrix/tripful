# Messaging & Notifications - Architecture

> Messaging feed and notification system for trip members. Discussion lives on the trip page below the itinerary. Notifications delivered in-app and via SMS with per-trip preferences.

## Reference Documents

- PRD: `docs/2026-02-14-messaging-notifications/PRD.md`
- Design: `docs/2026-02-14-messaging-notifications/DESIGN.md`
- Architecture: `docs/2026-02-14-messaging-notifications/ARCHITECTURE.md`
- Phases: `docs/2026-02-14-messaging-notifications/PHASES.md`

---

## Database Schema

### New Tables

All tables follow existing patterns: UUID PKs with `.defaultRandom()`, `timestamp(withTimezone: true)`, FK references with `onDelete: 'cascade'`.

**File**: `apps/api/src/db/schema/index.ts` (extend existing)

#### `messages`

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => messages.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- `parentId` NULL = top-level message, set = reply (flat, only to top-level)
- Soft delete via `deletedAt` + `deletedBy` (matches existing event/accommodation pattern)
- Indexes: `(tripId, createdAt DESC)`, `(parentId)`, partial on `parentId IS NULL AND deletedAt IS NULL`

#### `message_reactions`

```typescript
export const messageReactions = pgTable('message_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar('emoji', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.messageId, table.userId, table.emoji),
]);
```

- Allowed emoji values: `heart`, `thumbs_up`, `laugh`, `surprised`, `party`, `plane`
- Unique constraint prevents same user reacting with same emoji twice

#### `notifications`

```typescript
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- `type` values: `event_reminder`, `daily_itinerary`, `trip_message`, `trip_update`
- `data` JSONB: `{ eventId?, messageId?, tripId? }` for deep linking
- Indexes: partial on unread `(userId, createdAt DESC) WHERE readAt IS NULL`, `(tripId, userId, createdAt DESC)`

#### `notification_preferences`

```typescript
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  eventReminders: boolean('event_reminders').notNull().default(true),
  dailyItinerary: boolean('daily_itinerary').notNull().default(true),
  tripMessages: boolean('trip_messages').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.userId, table.tripId),
]);
```

- Created when member first RSVPs "Going" (all defaults: true)
- Updated via per-trip notification preferences dialog

#### `muted_members`

```typescript
export const mutedMembers = pgTable('muted_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mutedBy: uuid('muted_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.tripId, table.userId),
]);
```

#### `sent_reminders`

```typescript
export const sentReminders = pgTable('sent_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  referenceId: text('reference_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.type, table.referenceId, table.userId),
]);
```

- Dedup table: `reference_id` is event UUID for reminders, `{tripId}:{YYYY-MM-DD}` for daily

### Relations

**File**: `apps/api/src/db/schema/relations.ts` (extend existing)

```typescript
// Extend tripsRelations with: messages, notifications, notificationPreferences, mutedMembers
// Extend usersRelations with: messages, messageReactions, notifications, notificationPreferences

// New relations:
export const messagesRelations = relations(messages, ({ one, many }) => ({
  trip: one(trips, { fields: [messages.tripId], references: [trips.id] }),
  author: one(users, { fields: [messages.authorId], references: [users.id] }),
  parent: one(messages, { fields: [messages.parentId], references: [messages.id], relationName: 'messageReplies' }),
  replies: many(messages, { relationName: 'messageReplies' }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, { fields: [messageReactions.messageId], references: [messages.id] }),
  user: one(users, { fields: [messageReactions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  trip: one(trips, { fields: [notifications.tripId], references: [trips.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
  trip: one(trips, { fields: [notificationPreferences.tripId], references: [trips.id] }),
}));

export const mutedMembersRelations = relations(mutedMembers, ({ one }) => ({
  trip: one(trips, { fields: [mutedMembers.tripId], references: [trips.id] }),
  user: one(users, { fields: [mutedMembers.userId], references: [users.id] }),
  mutedByUser: one(users, { fields: [mutedMembers.mutedBy], references: [users.id] }),
}));

export const sentRemindersRelations = relations(sentReminders, ({ one }) => ({
  user: one(users, { fields: [sentReminders.userId], references: [users.id] }),
}));
```

---

## Shared Package

### Types

**File**: `shared/types/message.ts` (new)

```typescript
export interface Message {
  id: string;
  tripId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isPinned: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string; profilePhotoUrl: string | null };
  reactions: ReactionSummary[];
}

export interface MessageWithReplies extends Message {
  replies: Message[];
  replyCount: number;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean; // current user has reacted
}

export const ALLOWED_REACTIONS = ['heart', 'thumbs_up', 'laugh', 'surprised', 'party', 'plane'] as const;
export type AllowedReaction = typeof ALLOWED_REACTIONS[number];

export const REACTION_EMOJI_MAP: Record<AllowedReaction, string> = {
  heart: '\u2764\ufe0f', thumbs_up: '\ud83d\udc4d', laugh: '\ud83d\ude02',
  surprised: '\ud83d\ude2e', party: '\ud83c\udf89', plane: '\u2708\ufe0f',
};
```

**File**: `shared/types/notification.ts` (new)

```typescript
export type NotificationType = 'event_reminder' | 'daily_itinerary' | 'trip_message' | 'trip_update';

export interface Notification {
  id: string;
  userId: string;
  tripId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  eventReminders: boolean;
  dailyItinerary: boolean;
  tripMessages: boolean;
}
```

### Schemas

**File**: `shared/schemas/message.ts` (new)

```typescript
export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  parentId: z.string().uuid().optional(),
});
export const updateMessageSchema = z.object({ content: z.string().min(1).max(2000) });
export const toggleReactionSchema = z.object({
  emoji: z.enum(['heart', 'thumbs_up', 'laugh', 'surprised', 'party', 'plane']),
});
export const pinMessageSchema = z.object({ pinned: z.boolean() });
```

**File**: `shared/schemas/notification.ts` (new)

```typescript
export const notificationPreferencesSchema = z.object({
  eventReminders: z.boolean(),
  dailyItinerary: z.boolean(),
  tripMessages: z.boolean(),
});
```

Export from `shared/types/index.ts` and `shared/schemas/index.ts` barrel files.

---

## Backend Services

### MessageService

**File**: `apps/api/src/services/message.service.ts` (new)

Follows existing service pattern: class with interface, constructor accepts `(db: AppDatabase, permissionsService: IPermissionsService)`.

**Interface (`IMessageService`)**:

```typescript
// Queries
getMessages(tripId: string, userId: string, page: number, limit: number): Promise<PaginatedResult<MessageWithReplies>>
getMessageCount(tripId: string): Promise<number>
getLatestMessage(tripId: string): Promise<Message | null>

// Mutations
createMessage(tripId: string, authorId: string, data: CreateMessageInput): Promise<Message>
editMessage(messageId: string, userId: string, content: string): Promise<Message>
deleteMessage(messageId: string, userId: string, tripId: string): Promise<void>
togglePin(messageId: string, userId: string, tripId: string, pinned: boolean): Promise<Message>
toggleReaction(messageId: string, userId: string, emoji: string): Promise<ReactionSummary[]>

// Moderation
muteMember(tripId: string, userId: string, mutedBy: string): Promise<void>
unmuteMember(tripId: string, userId: string): Promise<void>
isMuted(tripId: string, userId: string): Promise<boolean>
getMutedMembers(tripId: string): Promise<MutedMember[]>
```

**Key behaviors**:
- `getMessages`: Returns top-level messages (parentId IS NULL), each with 2 most recent replies, author profile, reaction summaries with current user flag, total reply count. Soft-deleted messages return as placeholders with `{ id, deletedAt }`.
- `createMessage`: Validates going member (via PermissionsService), not muted, content 1-2000 chars, 100 top-level limit per trip. If parentId provided, validates parent is top-level and in same trip.
- `toggleReaction`: Inserts reaction if not exists, deletes if exists (toggle). Returns updated reaction summaries.
- Trip locked check: trips with endDate < today cannot have messages posted/edited/deleted/pinned/reacted.

**Permission methods to add to PermissionsService** (`apps/api/src/services/permissions.service.ts`):

```typescript
canViewMessages(userId: string, tripId: string): Promise<boolean>  // going member
canPostMessage(userId: string, tripId: string): Promise<boolean>   // going + not muted + not locked
canModerateMessages(userId: string, tripId: string): Promise<boolean>  // organizer
canMuteMember(userId: string, tripId: string, targetId: string): Promise<boolean>  // organizer + target not organizer
isTripLocked(tripId: string): Promise<boolean>  // endDate < today
```

### NotificationService

**File**: `apps/api/src/services/notification.service.ts` (new)

**Interface (`INotificationService`)**:

```typescript
// Queries
getNotifications(userId: string, opts: { page, limit, unreadOnly?, tripId? }): Promise<PaginatedResult<Notification> & { unreadCount: number }>
getUnreadCount(userId: string): Promise<number>
getTripUnreadCount(userId: string, tripId: string): Promise<number>

// Mutations
markAsRead(notificationId: string, userId: string): Promise<void>
markAllAsRead(userId: string, tripId?: string): Promise<void>

// Creation & Delivery
createNotification(params: { userId, tripId, type, title, body, data? }): Promise<Notification>
notifyTripMembers(params: { tripId, type, title, body, data?, excludeUserId? }): Promise<void>
// Gets going members, checks individual preferences, creates notification + optional SMS

// Preferences
getPreferences(userId: string, tripId: string): Promise<NotificationPreferences>
updatePreferences(userId: string, tripId: string, prefs: NotificationPreferencesInput): Promise<NotificationPreferences>
createDefaultPreferences(userId: string, tripId: string): Promise<void>
```

### SMS Service Refactor

**File**: `apps/api/src/services/sms.service.ts` (refactor existing)

Replace the existing `sendVerificationCode()` with a generic `sendMessage()` interface. The SMS service is a dumb transport layer — callers (NotificationService, SchedulerService) handle message formatting.

```typescript
export interface ISMSService {
  sendMessage(phoneNumber: string, message: string): Promise<void>;
}
```

`MockSMSService` logs to the logger. Update existing `sendVerificationCode` callers to use `sendMessage` with a formatted string instead.

### SchedulerService

**File**: `apps/api/src/services/scheduler.service.ts` (new)

```typescript
class SchedulerService {
  constructor(
    private notificationService: INotificationService,
    private smsService: ISMSService,
    private db: AppDatabase,
  ) {}

  start(): void   // Register interval timers
  stop(): void    // Clear interval timers

  // Event Reminders (5-min interval)
  async processEventReminders(): Promise<void>
  // Query events starting in 55-65 min window
  // For each: get going members with event_reminders=true
  // Check sent_reminders for dedup, create notification + SMS, record in sent_reminders

  // Daily Itinerary (15-min interval)
  async processDailyItineraries(): Promise<void>
  // Get active trips, check if 7:45-8:15 AM in trip's preferredTimezone
  // For matching: get day's events, going members with daily_itinerary=true
  // Dedup via sent_reminders (ref: tripId:YYYY-MM-DD), create notifications + SMS
}
```

Uses `date-fns-tz` for timezone-aware morning window detection:

```typescript
import { toZonedTime } from 'date-fns-tz';

function isMorningWindow(timezone: string): boolean {
  const zonedNow = toZonedTime(new Date(), timezone);
  const hour = zonedNow.getHours();
  const minute = zonedNow.getMinutes();
  return (hour === 7 && minute >= 45) || (hour === 8 && minute <= 15);
}
```

Registered on server startup via plugin, skipped in test environment.

**Design rationale & future migration path**:

The scheduling mechanism (`setInterval` in `start()`/`stop()`) is deliberately separated from the job logic (`processEventReminders()`, `processDailyItineraries()`). The process methods are fully stateless and idempotent - they query the DB, check dedup via `sent_reminders`, create notifications, and return. They don't care what invokes them.

This means migrating to AWS (or any external scheduler) is a deployment change, not a code rewrite:
1. Create Lambda handlers that call `processEventReminders()` / `processDailyItineraries()`
2. Set up EventBridge rules for the 5-min / 15-min schedules
3. Remove the `setInterval` calls from `start()`

No formal `ISchedulerProvider` abstraction is needed now (YAGNI) - the idempotency via `sent_reminders` is the real insurance that makes any trigger mechanism safe, whether it's setInterval, Lambda, a cron job, or manual invocation in tests.

---

## API Endpoints

### Messaging

All scoped under `/api/trips/:tripId/messages`. Follow existing route pattern: schema validation, authenticate + requireCompleteProfile hooks, rate limiting.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/trips/:tripId/messages` | authenticate | List top-level messages (paginated, newest first) |
| GET | `/api/trips/:tripId/messages/count` | authenticate | Message count for indicator |
| GET | `/api/trips/:tripId/messages/latest` | authenticate | Latest message for preview |
| POST | `/api/trips/:tripId/messages` | authenticate + completeProfile | Create message or reply |
| PUT | `/api/trips/:tripId/messages/:messageId` | authenticate + completeProfile | Edit message (author only) |
| DELETE | `/api/trips/:tripId/messages/:messageId` | authenticate + completeProfile | Soft-delete (author or organizer) |
| PATCH | `/api/trips/:tripId/messages/:messageId/pin` | authenticate + completeProfile | Pin/unpin (organizer only) |
| POST | `/api/trips/:tripId/messages/:messageId/reactions` | authenticate + completeProfile | Toggle reaction |
| POST | `/api/trips/:tripId/members/:memberId/mute` | authenticate + completeProfile | Mute member (organizer) |
| DELETE | `/api/trips/:tripId/members/:memberId/mute` | authenticate + completeProfile | Unmute member (organizer) |

**Files**:
- Routes: `apps/api/src/routes/message.routes.ts` (new)
- Controller: `apps/api/src/controllers/message.controller.ts` (new)

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | authenticate | List user's notifications (paginated) |
| GET | `/api/notifications/unread-count` | authenticate | Unread count for bell badge |
| PATCH | `/api/notifications/:id/read` | authenticate | Mark single notification read |
| PATCH | `/api/notifications/read-all` | authenticate | Mark all notifications read |
| GET | `/api/trips/:tripId/notifications` | authenticate | Trip-scoped notification list |
| GET | `/api/trips/:tripId/notifications/unread-count` | authenticate | Trip-scoped unread count |
| GET | `/api/trips/:tripId/notification-preferences` | authenticate | Get trip notification prefs |
| PUT | `/api/trips/:tripId/notification-preferences` | authenticate + completeProfile | Update trip notification prefs |

**Files**:
- Routes: `apps/api/src/routes/notification.routes.ts` (new)
- Controller: `apps/api/src/controllers/notification.controller.ts` (new)

### Error Types

**File**: `apps/api/src/errors.ts` (extend)

```typescript
export const MessageNotFoundError = createError('MESSAGE_NOT_FOUND', 'Message not found', 404);
export const MemberMutedError = createError('MEMBER_MUTED', 'You have been muted and cannot post messages', 403);
export const MessageLimitExceededError = createError('MESSAGE_LIMIT_EXCEEDED', 'Maximum 100 messages per trip reached', 409);
export const NotificationNotFoundError = createError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404);
export const AlreadyMutedError = createError('ALREADY_MUTED', 'Member is already muted', 409);
export const NotMutedError = createError('NOT_MUTED', 'Member is not muted', 404);
export const CannotMuteOrganizerError = createError('CANNOT_MUTE_ORGANIZER', 'Cannot mute an organizer', 403);
export const InvalidReplyTargetError = createError('INVALID_REPLY_TARGET', 'Can only reply to top-level messages', 400);
```

---

## Service Registration

### New Plugins

Follow existing pattern in `apps/api/src/plugins/`:

- `plugins/message-service.ts` - depends on `['database', 'permissions-service']`
- `plugins/notification-service.ts` - depends on `['database', 'sms-service']`
- `plugins/scheduler-service.ts` - depends on `['database', 'notification-service', 'sms-service']`

### Module Augmentation

**File**: `apps/api/src/types/index.ts` (extend)

```typescript
import type { IMessageService } from "@/services/message.service.js";
import type { INotificationService } from "@/services/notification.service.js";
import type { ISchedulerService } from "@/services/scheduler.service.js";

declare module "fastify" {
  interface FastifyInstance {
    // ... existing
    messageService: IMessageService;
    notificationService: INotificationService;
    schedulerService: ISchedulerService;
  }
}
```

### Route Registration

**File**: `apps/api/src/app.ts` (extend)

```typescript
// Add imports for new plugins and routes
import messageServicePlugin from "./plugins/message-service.js";
import notificationServicePlugin from "./plugins/notification-service.js";
import schedulerServicePlugin from "./plugins/scheduler-service.js";
import { messageRoutes } from "./routes/message.routes.js";
import { notificationRoutes } from "./routes/notification.routes.js";

// Register new service plugins (after existing ones)
await app.register(messageServicePlugin);
await app.register(notificationServicePlugin);
await app.register(schedulerServicePlugin);

// Register new routes
await app.register(messageRoutes, { prefix: "/api" });
await app.register(notificationRoutes, { prefix: "/api" });
```

---

## Frontend Architecture

### TanStack Query Hooks

**File**: `apps/web/src/hooks/use-messages.ts` (new)

```typescript
// Query key factory
const messageKeys = {
  all: ['messages'] as const,
  trip: (tripId: string) => [...messageKeys.all, tripId] as const,
  count: (tripId: string) => [...messageKeys.all, tripId, 'count'] as const,
  latest: (tripId: string) => [...messageKeys.all, tripId, 'latest'] as const,
};

// useMessages(tripId, enabled) - 5s polling gated by Intersection Observer
// useMessageCount(tripId) - 30s polling
// useLatestMessage(tripId) - 30s polling
// useCreateMessage(tripId) - optimistic add to feed
// useEditMessage(tripId) - optimistic content update
// useDeleteMessage(tripId) - optimistic placeholder
// useToggleReaction(tripId) - optimistic toggle
// usePinMessage(tripId) - optimistic toggle
// useMuteMember(tripId) / useUnmuteMember(tripId)
```

**File**: `apps/web/src/hooks/use-notifications.ts` (new)

```typescript
// Query key factory
const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: { tripId?: string }) => [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  tripUnreadCount: (tripId: string) => [...notificationKeys.all, 'unread-count', tripId] as const,
  preferences: (tripId: string) => [...notificationKeys.all, 'preferences', tripId] as const,
};

// useUnreadCount() - 30s polling (global)
// useTripUnreadCount(tripId) - 30s polling
// useNotifications(options?) - list (global or trip-scoped)
// useMarkAsRead() - optimistic update
// useMarkAllAsRead() - optimistic update
// useNotificationPreferences(tripId) / useUpdateNotificationPreferences(tripId)
```

### Component Tree

**Messaging** (`apps/web/src/components/messaging/`):

```
messaging/
  trip-messages.tsx              # Main container: section header + pinned + input + feed + load more
  message-count-indicator.tsx    # "X messages" clickable link in trip meta
  message-input.tsx              # Auto-growing textarea + send button + char count + disabled states
  message-card.tsx               # Single message: avatar, name, time, content, actions, reactions, replies
  message-reactions.tsx          # 6 emoji buttons with counts and active state
  message-replies.tsx            # 2 latest replies + "View X more" expand + reply input
  pinned-messages.tsx            # Pinned messages banner at top of discussion
```

**Notifications** (`apps/web/src/components/notifications/`):

```
notifications/
  notification-bell.tsx          # Global bell icon + badge for app header
  notification-dropdown.tsx      # Popover with recent notifications + mark all read
  notification-item.tsx          # Single notification row: icon, text, time, unread dot
  trip-notification-bell.tsx     # Per-trip bell icon + badge
  trip-notification-dialog.tsx   # Dialog with Notifications + Preferences tabs
  notification-preferences.tsx   # 3 toggle switches (Switch component)
```

### Integration Points

1. **App header** (`apps/web/src/components/app-header.tsx`):
   - Add `<NotificationBell />` between nav links and user avatar dropdown

2. **Trip detail page** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`):
   - Add `<TripNotificationBell tripId={trip.id} />` next to edit trip button
   - Add `<MessageCountIndicator tripId={trip.id} />` in trip meta section
   - Add `<TripMessages tripId={trip.id} />` section below itinerary

3. **Members list** (`apps/web/src/components/trip/members-list.tsx`):
   - Add "Mute"/"Unmute" option in member action dropdown menu (organizer only)
   - Add `Muted` badge next to RSVP status for muted members
   - Import `useMuteMember`/`useUnmuteMember` hooks

4. **RSVP handler** (`apps/api/src/services/invitation.service.ts` - `updateRsvp` method):
   - When status changes to "going": call `notificationService.createDefaultPreferences(userId, tripId)`

### Design Specifications

All design details are in `docs/2026-02-14-messaging-notifications/DESIGN.md`. Key patterns:

- Message cards: `bg-card rounded-xl border border-border p-4 hover:shadow-sm`
- Pinned banner: `bg-primary/5 border border-primary/20 rounded-xl p-4`
- Active reaction: `bg-primary/10 border-primary/30 text-primary`
- Reply indent: `ml-6 pl-4 border-l-2 border-border`
- Notification badge: `bg-destructive text-destructive-foreground rounded-full`
- Animations: message fade-in (300ms), reaction pop (200ms), badge pulse (600ms)

---

## Security & Permissions

| Action | Going Member | Organizer | Muted Member | Non-Going | Past Trip |
|--------|-------------|-----------|-------------|-----------|-----------|
| View messages | Yes | Yes | Yes | No | Yes |
| Post message | Yes | Yes | No | No | No |
| Edit own | Yes | Yes | No | No | No |
| Delete own | Yes | Yes | No | No | No |
| Delete any | No | Yes | No | No | No |
| Pin/Unpin | No | Yes | No | No | No |
| React | Yes | Yes | Yes | No | No |
| Mute member | No | Yes | No | No | No |

---

## Testing Strategy

### Backend Unit Tests (Vitest)
- `MessageService`: CRUD operations, permission enforcement, reaction toggle, mute checks, message limit
- `NotificationService`: CRUD, preference checking, bulk delivery
- `SmsService`: Message formatting for all notification types
- `SchedulerService`: Timing logic, deduplication, timezone handling

### Backend Integration Tests (Vitest)
- Message API: All endpoints with auth, permission errors, validation, edge cases
- Notification API: List, read, preferences, trip-scoped queries
- Cross-service: Message creation triggers notification, RSVP creates default preferences

### E2E Tests (Playwright)
- Post message, see in feed
- Reply, thread expands
- React, count updates
- Edit, "edited" indicator
- Delete, placeholder shown
- Organizer: delete other's message, pin, mute
- Notification bell: unread count
- Mark notification read
- Update notification preferences
- Past trip: read-only discussion

---

## Dependencies

### New packages
- `date-fns-tz` in `apps/api` (timezone handling for scheduler)

### Existing packages used
- `date-fns` (already in `apps/web`)
- `sonner` (toast notifications, already in `apps/web`)
- `@tanstack/react-query` (already in `apps/web`)
- shadcn/ui components: Dialog, Tabs, Switch, Popover, DropdownMenu (all already available)

---

## Audit Remediation

> Fixes for findings from the PR audit (`.thoughts/audits/2026-02-15-messaging-notifications-pr-audit.md`). Addresses 27 outstanding findings across security, performance, accessibility, code quality, and testing. 6 findings were already resolved.

### Already Verified (No Fix Needed)

| Finding | Status |
|---------|--------|
| #4 Barrel imports (`lucide-react`) | `optimizePackageImports: ['lucide-react']` already in `apps/web/next.config.ts:7` |
| #8 Trip lock on delete/edit/reaction | All mutations already call `isTripLocked` |
| #14 Toast dismissal try-catch | Fixed in Task 11.2 |
| #16 N+1 author fetch | Fixed in Task 8.1 |
| #24 Button CVA `gradient`/`icon-xs` | Already present in `apps/web/src/components/ui/button.tsx` |
| #27 Three Map builds | Fixed in Task 8.1 |

### Security Hardening

#### Authorization Enforcement (Findings #1-3)

`muteMember`, `unmuteMember`, `togglePin`, and `deleteMessage` lack explicit authorization checks — any authenticated trip member can call these endpoints. Service layer has permission helper methods (`canModerateMessages`, `canMuteMember`) but they are not called before executing operations.

**Fix**: Add authorization guards in the service layer methods. Call `permissionsService.canModerateMessages()` in `togglePin`, `muteMember`, `unmuteMember`. For `deleteMessage`, verify caller is author OR organizer. Throw `UnauthorizedError` (403) on failure. Add integration tests for unauthorized access returning 403.

**Files**:
- `apps/api/src/services/message.service.ts` — Add permission checks
- `apps/api/tests/unit/message.service.test.ts` — Test unauthorized attempts
- `apps/api/tests/integration/message.routes.test.ts` — Test 403 responses

#### XSS Sanitization (Finding #7)

Message `content` goes to database without HTML sanitization. React auto-escapes JSX, but defense-in-depth requires server-side stripping.

**Fix**: Strip all HTML tags from message content before storage. No HTML allowed in messages — use simple regex `content.replace(/<[^>]*>/g, '')` or install `sanitize-html` with empty allowedTags. Apply in `createMessage` and `editMessage`.

**File**: `apps/api/src/services/message.service.ts`

#### Transaction Wrapping (Finding #6)

`createMessage()` performs 6 sequential operations (verify trip, check permissions, check mute, verify parent, check limit, insert) without `db.transaction()`. Under concurrent writes these could race.

**Fix**: Wrap the full `createMessage` flow in `db.transaction()`.

**File**: `apps/api/src/services/message.service.ts`

#### Per-User Rate Limiting (Finding #19)

Only per-request rate limiting exists. A single user could flood a trip's message feed.

**Fix**: Add per-user per-trip daily message limit (200 messages/day) in `createMessage`. Count messages with `authorId = userId AND tripId = tripId AND createdAt > startOfDay(now)`.

**File**: `apps/api/src/services/message.service.ts`

### Frontend Performance

#### Suspense Boundary (Finding #9)

`usePathname()` at `notification-dropdown.tsx:22` on dynamic route `/trips/[id]` needs a Suspense boundary per Next.js docs.

**Fix**: Wrap `<NotificationDropdown>` in `<Suspense>` in `notification-bell.tsx`.

**File**: `apps/web/src/components/notifications/notification-bell.tsx`

#### MessageCard Memoization (Finding #10)

`MessageCard` in `.map()` without `React.memo()`. Parent state changes (e.g., `isInView`) re-render all cards.

**Fix**: Wrap `MessageCard` export in `React.memo()`.

**File**: `apps/web/src/components/messaging/message-card.tsx`

#### Badge Key Re-mount (Finding #20)

`<span key={displayCount}>` forces DOM re-mount on every count change instead of in-place update.

**Fix**: Remove `key={displayCount}`. Use CSS animation class toggling for the pulse effect.

**File**: `apps/web/src/components/notifications/notification-bell.tsx`

#### Regex Hoisting (Finding #21)

Regex `pathname.match(/^\/trips\/([^/]+)/)` at `notification-dropdown.tsx:33` recompiled every render.

**Fix**: Hoist to module-level: `const TRIP_PAGE_REGEX = /^\/trips\/([^/]+)/;`

**File**: `apps/web/src/components/notifications/notification-dropdown.tsx`

#### Memoize Filter (Finding #30)

`notifications.some()` iterates full array on every render.

**Fix**: Wrap in `useMemo(() => notifications.some(...), [notifications])`.

**File**: `apps/web/src/components/notifications/notification-dropdown.tsx`

### Accessibility & UX

#### Switch Import Verification (Finding #5)

Audit flags `import from "radix-ui"` at `switch.tsx:4`. Radix UI v2 uses the unified `radix-ui` package — verify `radix-ui` is in `package.json` dependencies. If so, import is correct and no change needed. If not, change to `@radix-ui/react-switch`.

**File**: `apps/web/src/components/ui/switch.tsx`

#### Aria Labels (Finding #11)

Missing `aria-label` on expand/collapse buttons.

**Fix**: Add `aria-label="Expand pinned messages"` / `"Collapse pinned messages"` and `aria-label="Show more replies"` / `"Hide replies"`.

**Files**:
- `apps/web/src/components/messaging/pinned-messages.tsx:28-29`
- `apps/web/src/components/messaging/message-replies.tsx:104,116`

#### Prefers Reduced Motion (Finding #12)

JS-based textarea height animation ignores `prefers-reduced-motion`.

**Fix**: Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before applying JS height transitions. If reduced motion preferred, set height instantly without transition.

**Files**:
- `apps/web/src/components/messaging/message-input.tsx:42-48`
- `apps/web/src/components/messaging/message-card.tsx:125-131`

#### Error Boundaries (Finding #13)

No Error Boundary wrapping messaging or notification component trees.

**Fix**: Create a reusable `ErrorBoundary` component (or use `react-error-boundary` if already available). Wrap `<TripMessages>` and notification dropdown in it with fallback UI showing "Something went wrong" + retry button.

**Files**:
- `apps/web/src/components/error-boundary.tsx` (new, if needed)
- `apps/web/src/components/messaging/trip-messages.tsx`
- `apps/web/src/components/notifications/notification-bell.tsx`

#### Character Count Visibility (Finding #33)

Character count only visible at 1800/2000, leaving users unaware of limit until near max.

**Fix**: Show character count from 1000 characters onwards with muted styling, transitioning to warning color at 1800.

**File**: `apps/web/src/components/messaging/message-input.tsx:134-143`

### Backend Code Quality

#### Centralized Error Handling (Finding #15)

Controllers manually catch errors with ~500 lines of redundant try/catch. Fastify's async error handler propagates `@fastify/error` types automatically using `statusCode`.

**Fix**: Remove try/catch from controller methods. Services already throw typed errors with `statusCode`. Fastify handles them automatically.

**Files**:
- `apps/api/src/controllers/message.controller.ts` — Remove all try/catch blocks
- `apps/api/src/controllers/notification.controller.ts` — Remove all try/catch blocks

#### Missing Database Indexes (Finding #18)

Missing indexes on frequently queried columns.

**Add**:
- `messages.authorId` index — Used in joins for author info
- `messageReactions.userId` index — Used in current-user reaction check
- `notifications(userId, createdAt DESC)` composite — General pagination query

Note: `notificationPreferences(userId, tripId)` already has a unique constraint which creates an implicit index.

**File**: `apps/api/src/db/schema/index.ts`, then `cd apps/api && pnpm db:generate && pnpm db:migrate`

#### OFFSET Pagination (Finding #17)

OFFSET pagination in notifications is slow at high page numbers. Acceptable for MVP scale but should have proper indexing.

**Fix**: The existing `notifications_user_unread_idx` covers unread queries. Add the `(userId, createdAt DESC)` composite index (above) to cover general pagination. No cursor migration needed at current scale.

#### Response Schemas (Finding #25)

`getUnreadCount` and some endpoints lack response schemas, missing `fast-json-stringify` optimization.

**Fix**: Add `response` schema definitions to all notification endpoints in route config.

**File**: `apps/api/src/routes/notification.routes.ts`

#### Plugin Dependencies (Finding #26)

Plugin dependency chain (message -> notification -> sms) not explicitly documented.

**Fix**: Add explicit `dependencies` arrays and JSDoc comments to plugin files.

**Files**: `apps/api/src/plugins/message-service.ts`, `notification-service.ts`, `scheduler-service.ts`

### E2E Test Robustness

#### Phone Number Collisions (Finding #23)

Timestamp-based phone numbers could collide in tight parallel runs.

**Fix**: Append `process.pid` or random 4-digit suffix to generated phone numbers.

**File**: `apps/web/tests/e2e/helpers/auth.ts`

#### Positional Selectors (Finding #22)

`.first()` on dynamic lists assumes feed ordering — fragile if order changes.

**Fix**: Use content-based filtering (`.filter({ hasText })`) instead of `.first()`. Where not possible, add `data-testid` attributes.

**File**: `apps/web/tests/e2e/messaging.spec.ts`

#### Test Tags (Finding #31)

No test tags for selective running.

**Fix**: Add `@smoke`, `@regression` tags to test titles. Mark slow tests with `@slow`.

**Files**: `apps/web/tests/e2e/messaging.spec.ts`, `apps/web/tests/e2e/notifications.spec.ts`

#### Parameterize Timeouts (Finding #32)

Hard-coded timeouts (10000, 15000) without explanation.

**Fix**: Extract to named constants with JSDoc comments explaining why each value was chosen.

**Files**: `apps/web/tests/e2e/messaging.spec.ts`, `apps/web/tests/e2e/notifications.spec.ts`

### Future-Proofing

#### Mutation Callback Signatures (Finding #28)

TanStack Query v5.89.0+ changed mutation `onSuccess`/`onError`/`onSettled` callbacks to 4 parameters.

**Fix**: Update all mutation callbacks to accept the new 4-parameter signature: `(data, variables, context, mutation)`.

**Files**: `apps/web/src/hooks/use-messages.ts`, `apps/web/src/hooks/use-notifications.ts`

#### Network Mode (Finding #29)

No `networkMode` configured (defaults to `online`). Fine for online-first app but should be explicit.

**Fix**: Add `networkMode: 'online'` to QueryClient `defaultOptions`.

**File**: `apps/web/src/providers/query-provider.tsx` or equivalent
