# Messaging & Notifications - Tasks

## Phase 1: Foundation (Database & Shared Package)

- [x] Task 1.1: Add database schemas, relations, and migration for messaging and notifications
  - Implement: Add `messages`, `message_reactions`, `notifications`, `notification_preferences`, `muted_members`, `sent_reminders` tables to `apps/api/src/db/schema/index.ts`
  - Implement: Add all Drizzle indexes (trip_toplevel partial, user_unread partial, sent_reminders_lookup)
  - Implement: Add relations for all new tables in `apps/api/src/db/schema/relations.ts` (extend existing tripsRelations/usersRelations + new messagesRelations, messageReactionsRelations, notificationsRelations, notificationPreferencesRelations, mutedMembersRelations, sentRemindersRelations)
  - Implement: Generate migration with `cd apps/api && pnpm db:generate`
  - Implement: Apply migration with `pnpm db:migrate`
  - Test: Verify schema compiles with `pnpm typecheck`
  - Verify: Run full test suite, all existing tests pass

- [x] Task 1.2: Create shared types and Zod schemas for messages and notifications
  - Implement: Create `shared/types/message.ts` (Message, MessageWithReplies, ReactionSummary, ALLOWED_REACTIONS, AllowedReaction, REACTION_EMOJI_MAP)
  - Implement: Create `shared/types/notification.ts` (NotificationType, Notification, NotificationPreferences)
  - Implement: Create `shared/schemas/message.ts` (createMessageSchema, updateMessageSchema, toggleReactionSchema, pinMessageSchema + response schemas)
  - Implement: Create `shared/schemas/notification.ts` (notificationPreferencesSchema + response schemas)
  - Implement: Export all from `shared/types/index.ts` and `shared/schemas/index.ts` barrel files
  - Test: Run `pnpm typecheck` to verify compilation
  - Verify: Run full test suite, all tests pass

## Phase 2: Backend Messaging

- [ ] Task 2.1: Create MessageService with CRUD, permissions, and reactions
  - Implement: Add messaging permission methods to `apps/api/src/services/permissions.service.ts` (canViewMessages, canPostMessage, canModerateMessages, canMuteMember, isTripLocked)
  - Implement: Add error types to `apps/api/src/errors.ts` (MessageNotFoundError, MemberMutedError, MessageLimitExceededError, InvalidReplyTargetError)
  - Implement: Create `apps/api/src/services/message.service.ts` with IMessageService interface and MessageService class
  - Implement: Implement getMessages (paginated, top-level, with 2 recent replies, author profile, reaction summaries with current user flag)
  - Implement: Implement getMessageCount, getLatestMessage
  - Implement: Implement createMessage with validation (going member, not muted, content 1-2000 chars, 100 top-level limit, reply parent validation)
  - Implement: Implement editMessage (author only, sets editedAt), deleteMessage (author or organizer, soft delete)
  - Implement: Implement togglePin (organizer only, top-level only)
  - Implement: Implement toggleReaction (add/remove toggle, return updated summaries)
  - Implement: Create `apps/api/src/plugins/message-service.ts` plugin
  - Test: Write unit tests in `apps/api/tests/unit/message.service.test.ts` covering CRUD, permissions, reactions, mute enforcement, message limits, reply validation
  - Test: Write unit tests for new permission methods in `apps/api/tests/unit/permissions.service.test.ts`
  - Verify: Run full test suite, all tests pass

- [ ] Task 2.2: Create message API routes, controller, and integration tests
  - Implement: Create `apps/api/src/controllers/message.controller.ts` following existing controller pattern (object with named methods)
  - Implement: Create `apps/api/src/routes/message.routes.ts` with all messaging endpoints (GET list/count/latest, POST create, PUT edit, DELETE, PATCH pin, POST reactions)
  - Implement: Register message routes and plugin in `apps/api/src/app.ts`
  - Implement: Add IMessageService import and messageService to Fastify module augmentation in `apps/api/src/types/index.ts`
  - Test: Write integration tests in `apps/api/tests/integration/message.routes.test.ts` covering all endpoints with auth, permission errors, validation, edge cases
  - Verify: Run full test suite, all tests pass

- [ ] Task 2.3: Implement mute/unmute with API routes and tests
  - Implement: Add muteMember, unmuteMember, isMuted, getMutedMembers methods to MessageService
  - Implement: Add error types to `apps/api/src/errors.ts` (AlreadyMutedError, NotMutedError, CannotMuteOrganizerError)
  - Implement: Add mute/unmute endpoints to message routes (POST/DELETE `/trips/:tripId/members/:memberId/mute`)
  - Implement: Add mute controller methods to message.controller.ts
  - Test: Write unit tests for mute/unmute in message.service.test.ts
  - Test: Write integration tests for mute endpoints in message.routes.test.ts
  - Verify: Run full test suite, all tests pass

## Phase 3: Backend Notifications

- [ ] Task 3.1: Refactor SMS service and create NotificationService with preferences
  - Implement: Refactor ISMSService in `apps/api/src/services/sms.service.ts` to a generic `sendMessage(phoneNumber: string, message: string)` interface, replacing `sendVerificationCode`. Update MockSMSService and all existing callers accordingly.
  - Implement: Add NotificationNotFoundError to `apps/api/src/errors.ts`
  - Implement: Create `apps/api/src/services/notification.service.ts` with INotificationService interface and NotificationService class
  - Implement: Implement getNotifications (paginated, with tripId filter, unreadOnly filter), getUnreadCount, getTripUnreadCount
  - Implement: Implement markAsRead, markAllAsRead (with optional tripId scope)
  - Implement: Implement createNotification (in-app + SMS based on preferences)
  - Implement: Implement notifyTripMembers (bulk: get going members, check preferences, create notifications + SMS)
  - Implement: Implement getPreferences, updatePreferences (upsert), createDefaultPreferences
  - Implement: Create `apps/api/src/plugins/notification-service.ts` plugin
  - Test: Write unit tests in `apps/api/tests/unit/notification.service.test.ts` covering CRUD, preferences, bulk delivery, SMS integration
  - Test: Write unit tests for SMS service in `apps/api/tests/unit/sms.service.test.ts` (sendMessage delegation to provider)
  - Verify: Run full test suite, all tests pass

- [ ] Task 3.2: Create notification API routes, controller, and integration tests
  - Implement: Create `apps/api/src/controllers/notification.controller.ts`
  - Implement: Create `apps/api/src/routes/notification.routes.ts` with all notification endpoints (GET list/unread-count, PATCH read/read-all, GET trip-scoped list/unread-count, GET/PUT preferences)
  - Implement: Register notification routes and plugin in `apps/api/src/app.ts`
  - Implement: Add INotificationService import and notificationService to Fastify module augmentation
  - Test: Write integration tests in `apps/api/tests/integration/notification.routes.test.ts` covering all endpoints
  - Verify: Run full test suite, all tests pass

- [ ] Task 3.3: Create SchedulerService for event reminders and daily itinerary
  - Implement: Install `date-fns-tz` in apps/api (`cd apps/api && pnpm add date-fns-tz`)
  - Implement: Create `apps/api/src/services/scheduler.service.ts` with ISchedulerService, start/stop lifecycle
  - Implement: Implement processEventReminders (5-min interval, 55-65min lookahead window, dedup via sent_reminders, create notifications + SMS)
  - Implement: Implement processDailyItineraries (15-min interval, 7:45-8:15 AM timezone window using date-fns-tz, dedup, create notifications + SMS)
  - Implement: Create `apps/api/src/plugins/scheduler-service.ts` plugin (skip start in test env)
  - Implement: Register scheduler plugin in `apps/api/src/app.ts`, add ISchedulerService to module augmentation
  - Test: Write unit tests in `apps/api/tests/unit/scheduler.service.test.ts` covering timing logic, deduplication, timezone handling
  - Verify: Run full test suite, all tests pass

- [ ] Task 3.4: Hook message creation to notifications and RSVP to default preferences
  - Implement: In MessageService.createMessage, after successful top-level message insert, call notificationService.notifyTripMembers with type 'trip_message', excluding the author
  - Implement: In InvitationService.updateRsvp (`apps/api/src/services/invitation.service.ts`), when status changes to 'going', call notificationService.createDefaultPreferences
  - Implement: Add notificationService dependency to MessageService constructor and plugin
  - Test: Write integration test verifying message creation triggers notifications for other going members
  - Test: Write integration test verifying RSVP to "going" creates default notification preferences
  - Verify: Run full test suite, all tests pass

## Phase 4: Frontend Messaging

- [ ] Task 4.1: Create messaging TanStack Query hooks with optimistic updates
  - Implement: Create `apps/web/src/hooks/use-messages.ts` with messageKeys factory
  - Implement: Implement useMessages(tripId, enabled) with 5s polling via refetchInterval
  - Implement: Implement useMessageCount(tripId) and useLatestMessage(tripId) with 30s polling
  - Implement: Implement useCreateMessage with optimistic add to cache
  - Implement: Implement useEditMessage with optimistic content update
  - Implement: Implement useDeleteMessage with optimistic placeholder
  - Implement: Implement useToggleReaction with optimistic toggle
  - Implement: Implement usePinMessage with optimistic toggle
  - Implement: Implement useMuteMember / useUnmuteMember
  - Test: Verify hooks compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

- [ ] Task 4.2: Build discussion section components (message feed, input, cards, reactions, replies)
  - Implement: Create `apps/web/src/components/messaging/message-input.tsx` (auto-growing textarea, send button, char count at >1800, disabled states for muted/past trip)
  - Implement: Create `apps/web/src/components/messaging/message-reactions.tsx` (6 emoji buttons, counts, active state highlighting, toggle behavior)
  - Implement: Create `apps/web/src/components/messaging/message-replies.tsx` (2 latest replies, "View X more" expand, reply input, flat threading)
  - Implement: Create `apps/web/src/components/messaging/message-card.tsx` (avatar, author, time, content, edited indicator, deleted placeholder, actions menu, reactions, replies)
  - Implement: Create `apps/web/src/components/messaging/pinned-messages.tsx` (pinned banner with pin icon, expandable messages)
  - Implement: Create `apps/web/src/components/messaging/message-count-indicator.tsx` (clickable "X messages" link with latest preview, scrolls to discussion)
  - Implement: Create `apps/web/src/components/messaging/trip-messages.tsx` (main container: section header, pinned, input, feed, load more, Intersection Observer for polling)
  - Implement: Follow design specs from DESIGN.md for all styles, animations, accessibility (ARIA labels, keyboard nav)
  - Test: Verify components compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

- [ ] Task 4.3: Integrate discussion section into trip page with state handling
  - Implement: Add `<MessageCountIndicator tripId={trip.id} />` to trip meta section in `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`
  - Implement: Add `<TripMessages tripId={trip.id} />` section below itinerary in trip-detail-content.tsx
  - Implement: Conditionally render discussion only for going members (check member status)
  - Implement: Handle past trip read-only state (disable input, hide actions)
  - Implement: Handle muted state (disable input with muted notice)
  - Implement: Add loading skeletons, empty state ("No messages yet. Start the conversation!")
  - Implement: Add error handling with sonner toast on mutation errors
  - Test: Verify integration compiles and renders with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

- [ ] Task 4.4: Add mute/unmute controls to Members list
  - Implement: Add "Mute"/"Unmute" option in member action dropdown in `apps/web/src/components/trip/members-list.tsx` (organizer only, not for other organizers or creator)
  - Implement: Add muted badge (`Muted`) next to RSVP status for muted members
  - Implement: Use useMuteMember/useUnmuteMember hooks from use-messages.ts
  - Implement: Add confirmation dialog before muting
  - Test: Verify changes compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

## Phase 5: Frontend Notifications

- [ ] Task 5.1: Create notification TanStack Query hooks
  - Implement: Create `apps/web/src/hooks/use-notifications.ts` with notificationKeys factory
  - Implement: Implement useUnreadCount() with 30s polling
  - Implement: Implement useTripUnreadCount(tripId) with 30s polling
  - Implement: Implement useNotifications(options?) for list (global or trip-scoped, paginated)
  - Implement: Implement useMarkAsRead() with optimistic update
  - Implement: Implement useMarkAllAsRead() with optimistic update
  - Implement: Implement useNotificationPreferences(tripId) / useUpdateNotificationPreferences(tripId)
  - Test: Verify hooks compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

- [ ] Task 5.2: Build global notification bell and dropdown for app header
  - Implement: Create `apps/web/src/components/notifications/notification-item.tsx` (type icon, trip name, body preview, timestamp, unread dot, click handler)
  - Implement: Create `apps/web/src/components/notifications/notification-bell.tsx` (bell icon + badge with count, 9+ max display)
  - Implement: Create `apps/web/src/components/notifications/notification-dropdown.tsx` (Popover with recent 10 notifications, "Mark all as read", empty state)
  - Implement: Add `<NotificationBell />` to `apps/web/src/components/app-header.tsx` between nav links and user avatar
  - Implement: Handle notification click: mark as read + navigate to content (message scroll, trip navigation)
  - Implement: Follow design specs for badge pulse animation, dropdown sizing (380px)
  - Test: Verify components compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

- [ ] Task 5.3: Build per-trip notification bell, dialog with tabs, and preferences
  - Implement: Create `apps/web/src/components/notifications/notification-preferences.tsx` (3 toggle switches using shadcn Switch, immediate save on toggle, footer note about SMS)
  - Implement: Create `apps/web/src/components/notifications/trip-notification-bell.tsx` (bell icon + badge for trip-scoped unread count)
  - Implement: Create `apps/web/src/components/notifications/trip-notification-dialog.tsx` (Dialog with Tabs: Notifications list + Preferences tab, mark all read, pagination)
  - Implement: Add `<TripNotificationBell tripId={trip.id} />` next to edit trip button in trip-detail-content.tsx
  - Implement: Handle notification click within dialog: mark as read, navigate, close dialog
  - Test: Verify components compile with `pnpm typecheck`
  - Verify: Run full test suite, all tests pass

## Phase 6: E2E Testing & Polish

- [ ] Task 6.1: E2E tests for messaging flows
  - Test: Create `apps/web/tests/e2e/messaging.spec.ts`
  - Test: Post a message, verify it appears in feed
  - Test: Reply to a message, verify thread expands
  - Test: React to a message, verify count updates
  - Test: Edit own message, verify "edited" indicator
  - Test: Delete own message, verify "message deleted" placeholder
  - Test: Organizer deletes another member's message
  - Test: Organizer pins/unpins a message, verify pinned section
  - Test: Organizer mutes a member, verify disabled input with notice
  - Test: Muted member sees disabled input
  - Test: Past trip shows read-only discussion (disabled input, no actions)
  - Verify: All E2E tests pass, manual verification with screenshots

- [ ] Task 6.2: E2E tests for notification flows
  - Test: Create `apps/web/tests/e2e/notifications.spec.ts`
  - Test: Notification bell shows unread count after message is posted
  - Test: Click notification, navigates to trip discussion
  - Test: Mark single notification as read, badge count decreases
  - Test: Mark all notifications as read
  - Test: Update notification preferences (toggle off trip messages)
  - Test: Per-trip notification bell shows trip-scoped unread count
  - Verify: All E2E tests pass, manual verification with screenshots

- [ ] Task 6.3: Polish - animations, accessibility, and mobile responsiveness
  - Implement: Add message entry animation (fade in from top, 300ms)
  - Implement: Add reaction pop animation (scale 1.3, 200ms)
  - Implement: Add notification badge pulse on count change (600ms)
  - Implement: Verify keyboard navigation (Tab through messages/reactions, Enter/Space toggle, Escape close)
  - Implement: Verify ARIA labels on all interactive elements (message feed role="feed", reactions role="group" with aria-pressed)
  - Implement: Verify mobile responsive layout (reduced padding, full-width cards, bottom-sheet notification dropdown)
  - Implement: Intersection Observer to pause polling when discussion section not in viewport
  - Implement: Smooth scroll animation when clicking "X messages" indicator
  - Test: Manual browser testing for animations and mobile layout
  - Verify: Run full test suite, all tests pass

## Phase 7: Final Verification

- [ ] Task 7.1: Full regression check
  - Verify: All unit tests pass (`pnpm test`)
  - Verify: All integration tests pass
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: Type checking passes (`pnpm typecheck`)
  - Verify: No console errors in browser during manual testing
