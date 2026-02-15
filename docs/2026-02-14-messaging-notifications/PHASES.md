# Messaging & Notifications - Implementation Phases

> **Status**: All phases planned | Last Updated: 2026-02-14

## Phase 1: Database & Shared Types (Foundation)

**Database:**

- [ ] Add `messages` table (id, tripId, authorId, parentId, content, isPinned, editedAt, deletedAt, deletedBy, timestamps)
- [ ] Add `message_reactions` table (id, messageId, userId, emoji, createdAt, unique constraint)
- [ ] Add `notifications` table (id, userId, tripId, type, title, body, data JSONB, readAt, createdAt)
- [ ] Add `notification_preferences` table (id, userId, tripId, eventReminders, dailyItinerary, tripMessages, timestamps, unique constraint)
- [ ] Add `muted_members` table (id, tripId, userId, mutedBy, createdAt, unique constraint)
- [ ] Add `sent_reminders` table (id, type, referenceId, userId, sentAt, unique constraint)
- [ ] Define Drizzle relations for all new tables
- [ ] Generate migration: `cd apps/api && pnpm db:generate`
- [ ] Apply migration: `pnpm db:migrate`
- [ ] Add performance indexes (trip_toplevel, user_unread, sent_reminders_lookup)

**Shared:**

- [ ] Create `shared/types/message.ts` (Message, MessageWithReplies, ReactionSummary, ALLOWED_REACTIONS, REACTION_EMOJI_MAP)
- [ ] Create `shared/types/notification.ts` (Notification, NotificationPreferences, NotificationType)
- [ ] Create `shared/schemas/message.ts` (createMessageSchema, updateMessageSchema, toggleReactionSchema, pinMessageSchema)
- [ ] Create `shared/schemas/notification.ts` (notificationPreferencesSchema)
- [ ] Export from barrel files (`shared/types/index.ts`, `shared/schemas/index.ts`)

## Phase 2: Backend Messaging

**Backend:**

- [ ] Create `MessageService` with getMessages(), getMessageCount(), getLatestMessage()
- [ ] Implement createMessage() with going member + mute + limit validation
- [ ] Implement editMessage() (author only, sets editedAt)
- [ ] Implement deleteMessage() (author or organizer, soft delete)
- [ ] Implement togglePin() (organizer only, top-level only)
- [ ] Implement toggleReaction() (add/remove toggle)
- [ ] Implement muteMember() / unmuteMember() / isMuted()
- [ ] Add messaging permission checks to PermissionsService (canViewMessages, canPostMessage, canModerateMessages, canMuteMember)
- [ ] Create `MessageController` (thin adapter, delegates to service)
- [ ] Create `message.routes.ts` (GET/POST/PUT/DELETE /trips/:tripId/messages/*, mute/unmute endpoints)
- [ ] Add error types: MESSAGE_NOT_FOUND, MEMBER_MUTED, MESSAGE_LIMIT_EXCEEDED, ALREADY_MUTED, NOT_MUTED, CANNOT_MUTE_ORGANIZER
- [ ] Apply rate limiting (read: defaultRateLimit, write: writeRateLimit)

**E2E:**

- [ ] Unit tests for MessageService (CRUD, permissions, reactions, muting, limits)
- [ ] Integration tests for message API endpoints (auth, validation, edge cases)

## Phase 3: Backend Notification Service

**Backend:**

- [ ] Create `SmsService` with SmsProvider interface and MockSmsProvider
- [ ] Implement sendEventReminder(), sendDailyItinerary(), sendTripMessage() formatters
- [ ] Create `NotificationService` with getNotifications(), getUnreadCount()
- [ ] Implement markAsRead() / markAllAsRead()
- [ ] Implement createNotification() (in-app + SMS delivery based on preferences)
- [ ] Implement notifyTripMembers() (bulk notification with preference checking)
- [ ] Implement getPreferences() / updatePreferences() / createDefaultPreferences()
- [ ] Create `NotificationController`
- [ ] Create `notification.routes.ts` (GET/PATCH /notifications/*, GET/PUT /trips/:tripId/notification-preferences, GET /trips/:tripId/notifications)
- [ ] Add error types: NOTIFICATION_NOT_FOUND
- [ ] Hook message creation to notification delivery (top-level messages trigger notifyTripMembers)
- [ ] Hook RSVP "Going" to create default notification preferences

**Backend (Scheduler):**

- [ ] Create `SchedulerService` with start()/stop() lifecycle
- [ ] Implement processEventReminders() (5-min interval, 55-65min lookahead, dedup via sent_reminders)
- [ ] Implement processDailyItineraries() (15-min interval, 8am timezone window, dedup)
- [ ] Register scheduler on server startup (skip in test env)
- [ ] Timezone-aware morning window detection using luxon or date-fns-tz

**E2E:**

- [ ] Unit tests for NotificationService (CRUD, preferences, delivery)
- [ ] Unit tests for SmsService (formatting, provider interface)
- [ ] Unit tests for SchedulerService (timing logic, deduplication, timezone handling)
- [ ] Integration tests for notification API endpoints

## Phase 4: Frontend Messaging UI

**Frontend (Hooks):**

- [ ] Create `use-messages.ts` with messageKeys factory
- [ ] Implement useMessages(tripId) with 5s polling (Intersection Observer gated)
- [ ] Implement useMessageCount(tripId) with 30s polling
- [ ] Implement useLatestMessage(tripId) with 30s polling
- [ ] Implement useCreateMessage(tripId) with optimistic add
- [ ] Implement useEditMessage(tripId) with optimistic update
- [ ] Implement useDeleteMessage(tripId) with optimistic placeholder
- [ ] Implement useToggleReaction(tripId) with optimistic toggle
- [ ] Implement usePinMessage(tripId) with optimistic toggle
- [ ] Implement useMuteMember(tripId) / useUnmuteMember(tripId)

**Frontend (Components):**

- [ ] Create `trip-messages.tsx` - main container with section header, pinned banner, input, feed
- [ ] Create `message-count-indicator.tsx` - "X messages" link with latest preview in trip meta
- [ ] Create `message-input.tsx` - auto-growing textarea with send button, char count, disabled states
- [ ] Create `message-card.tsx` - message with author, content, time, edited indicator, actions menu
- [ ] Create `message-reactions.tsx` - 6 emoji buttons with counts, active state highlighting
- [ ] Create `message-replies.tsx` - 2 latest replies, "View X more" expand, reply input
- [ ] Create `pinned-messages.tsx` - pinned messages banner at top of discussion

**Frontend (Integration):**

- [ ] Add "X messages" indicator in trip meta section (scrolls to discussion)
- [ ] Add `<TripMessages>` section below itinerary on trip detail page
- [ ] Add "Mute"/"Unmute" option in Members dialog action menu (organizer only)
- [ ] Add muted badge in Members dialog for muted members
- [ ] Handle past trip read-only state (input disabled, actions hidden)
- [ ] Handle muted state (input disabled with notice)
- [ ] Loading skeletons, empty state, error handling with toast

## Phase 5: Frontend Notification UI

**Frontend (Hooks):**

- [ ] Create `use-notifications.ts` with notificationKeys factory
- [ ] Implement useUnreadCount() with 30s polling
- [ ] Implement useNotifications(options) for list (global + trip-scoped)
- [ ] Implement useMarkAsRead() with optimistic update
- [ ] Implement useMarkAllAsRead() with optimistic update
- [ ] Implement useNotificationPreferences(tripId) / useUpdateNotificationPreferences(tripId)

**Frontend (Components):**

- [ ] Create `notification-bell.tsx` - bell icon + badge for app header
- [ ] Create `notification-dropdown.tsx` - popover with recent notifications + "Mark all read"
- [ ] Create `notification-item.tsx` - single notification row with icon, text, time, unread dot
- [ ] Create `trip-notification-bell.tsx` - per-trip bell icon + badge
- [ ] Create `trip-notification-dialog.tsx` - dialog with Notifications + Preferences tabs
- [ ] Create `notification-preferences.tsx` - toggle switches for 3 subscription types

**Frontend (Integration):**

- [ ] Add `<NotificationBell>` to app-header.tsx (between nav and user avatar)
- [ ] Add `<TripNotificationBell>` next to edit trip button on trip page
- [ ] Deep link notifications to specific content (message scroll, trip navigation)
- [ ] Handle notification click: mark as read + navigate

## Phase 6: Testing & Polish

**Frontend Tests:**

- [ ] Unit tests for message components (rendering, interactions, empty states, muted, past trip)
- [ ] Unit tests for notification components (bell badge, dropdown, dialog tabs, preferences)
- [ ] Unit tests for TanStack Query hooks (optimistic updates, polling, error rollback)

**E2E Tests (Playwright):**

- [ ] Post a message, see it in feed
- [ ] Reply to a message, see thread expand
- [ ] React to a message, see count update
- [ ] Edit own message, see "edited" indicator
- [ ] Delete own message, see "message deleted" placeholder
- [ ] Organizer: delete other's message
- [ ] Organizer: pin/unpin a message
- [ ] Organizer: mute/unmute a member
- [ ] Muted member sees disabled input
- [ ] Notification bell shows unread count
- [ ] Click notification, navigates to content
- [ ] Mark notification as read / mark all as read
- [ ] Update notification preferences

**Polish:**

- [ ] Loading skeletons for message feed and notification dropdown
- [ ] Empty states for no messages, no notifications
- [ ] Optimistic update rollback with toast on error
- [ ] Mobile-responsive message feed layout
- [ ] Keyboard navigation (Enter to send, Shift+Enter newline)
- [ ] Intersection Observer to pause polling when discussion not in viewport
- [ ] Smooth scroll animation to discussion section
- [ ] Reaction pop animation
- [ ] Notification badge pulse on count change
