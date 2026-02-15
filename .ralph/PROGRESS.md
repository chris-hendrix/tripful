# Ralph Progress

Tracking implementation progress for Messaging & Notifications feature.

---

## Iteration 1 — Task 1.1: Add database schemas, relations, and migration ✅

**Status**: COMPLETED

### What was done
- Added 6 new Drizzle ORM table definitions to `apps/api/src/db/schema/index.ts`:
  - `messages` — Trip chat messages with threading (self-referencing `parentId`), soft-delete (`deletedAt`/`deletedBy`), pinning
  - `messageReactions` — Emoji reactions with unique constraint per user/message/emoji
  - `notifications` — User notifications with nullable `tripId`, partial index for unread
  - `notificationPreferences` — Per-user per-trip notification toggles (event_reminders, daily_itinerary, trip_messages)
  - `mutedMembers` — Member muting with two FK refs to users (disambiguated via `relationName`)
  - `sentReminders` — Deduplication tracking for scheduled reminders
- Added `import { sql } from "drizzle-orm"` and `import type { AnyPgColumn } from "drizzle-orm/pg-core"` for partial indexes and self-referencing FK
- Extended `usersRelations` with 4 new `many()` entries and `tripsRelations` with 4 new `many()` entries
- Added 6 new relation definitions: `messagesRelations`, `messageReactionsRelations`, `notificationsRelations`, `notificationPreferencesRelations`, `mutedMembersRelations`, `sentRemindersRelations`
- Exported 12 inferred types (`$inferSelect` + `$inferInsert` for each table)
- Generated migration `0011_big_gressill.sql` and applied it to PostgreSQL

### Key implementation details
- Self-referencing `messages.parentId` uses `(): AnyPgColumn => messages.id` to resolve TypeScript circular inference
- Partial indexes: `messages_trip_toplevel_idx` (WHERE parentId IS NULL AND deletedAt IS NULL) and `notifications_user_unread_idx` (WHERE readAt IS NULL)
- `notifications.tripId` is nullable (no `.notNull()`) for system-level notifications
- Used object syntax `(table) => ({...})` for index callbacks matching existing codebase convention (not array syntax from architecture doc)
- Named all unique constraints following existing pattern: `tablename_columns_unique`

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit`
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 803 API tests pass, 197 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **Migration**: ✅ Generated and applied successfully with all 6 tables, FKs, indexes, and partial indexes

### Reviewer verdict: APPROVED
- All 6 tables match architecture spec column-for-column
- No regressions to existing table definitions or relations
- Code style consistent with existing patterns

### Learnings for future iterations
- Drizzle self-referencing FKs require `AnyPgColumn` type annotation to avoid circular inference errors
- Drizzle config only reads from `index.ts` for migration generation — relations are runtime-only
- The architecture doc uses array syntax for index callbacks, but existing codebase uses object syntax — always follow existing codebase conventions
- Pre-existing web test failure in `accommodation-card.test.tsx` ("3 nights" text not found) — not introduced by us, existed on main

---

## Iteration 2 — Task 1.2: Create shared types and Zod schemas for messages and notifications ✅

**Status**: COMPLETED

### What was done
- Created `shared/types/message.ts` — Message, MessageWithReplies, ReactionSummary interfaces, ALLOWED_REACTIONS constant array, AllowedReaction type, REACTION_EMOJI_MAP constant, and 6 API response type interfaces (GetMessagesResponse, GetMessageCountResponse, GetLatestMessageResponse, CreateMessageResponse, UpdateMessageResponse, ToggleReactionResponse)
- Created `shared/types/notification.ts` — NotificationType literal union, Notification interface, NotificationPreferences interface, and 4 API response type interfaces (GetNotificationsResponse, GetUnreadCountResponse, GetNotificationPreferencesResponse, UpdateNotificationPreferencesResponse)
- Created `shared/schemas/message.ts` — 4 input validation schemas (createMessageSchema, updateMessageSchema, toggleReactionSchema, pinMessageSchema), 5 response schemas (messageListResponseSchema, messageCountResponseSchema, latestMessageResponseSchema, messageResponseSchema, toggleReactionResponseSchema), and 4 inferred input types
- Created `shared/schemas/notification.ts` — 1 input schema (notificationPreferencesSchema), 3 response schemas (notificationListResponseSchema, unreadCountResponseSchema, notificationPreferencesResponseSchema), and 1 inferred input type
- Updated `shared/types/index.ts` — Added re-exports for all message types (type exports) plus value exports for ALLOWED_REACTIONS and REACTION_EMOJI_MAP; added re-exports for all notification types
- Updated `shared/schemas/index.ts` — Added re-exports for all message schemas + input types; added re-exports for all notification schemas + input types
- Created `shared/__tests__/message-schemas.test.ts` — 14 tests covering createMessageSchema (valid, with parentId, empty rejected, over 2000 rejected, boundary 2000, invalid parentId UUID, control chars stripped), updateMessageSchema (valid, empty rejected, over 2000 rejected), toggleReactionSchema (6 valid emojis, invalid rejected), pinMessageSchema (valid booleans, non-boolean rejected)
- Created `shared/__tests__/notification-schemas.test.ts` — 5 tests covering notificationPreferencesSchema (valid all-field, all-false, all-true, missing fields rejected, non-boolean rejected)

### Key implementation details
- Content fields in message schemas use `.transform(stripControlChars)` for sanitization, matching existing codebase pattern
- Response entity schemas use `z.date()` for timestamp fields (matching how Drizzle returns Date objects on the server side), while TypeScript type interfaces use `string` for dates (matching API JSON serialization perspective) — this follows the existing inconsistency pattern across the codebase
- Notification response entity schema uses `z.string()` for the `type` field rather than `z.enum()` since it's a response-only schema (server controls these values)
- Root barrel file (`shared/index.ts`) was NOT modified — newer domains (events, accommodations, member-travel, messages, notifications) are accessed via subpath imports only, per established pattern
- Value exports (ALLOWED_REACTIONS, REACTION_EMOJI_MAP) are exported separately from type-only re-exports in the types barrel file

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 216 shared tests pass (19 new), 803 API tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)

### Reviewer verdict: APPROVED
- All types match architecture spec exactly (field-for-field)
- All schemas match architecture spec
- Barrel file exports complete and correct
- Tests cover main validation rules with good boundary testing
- Code style matches existing codebase conventions
- Two low-severity notes (non-blocking): date type inconsistency between schemas/types matches existing codebase pattern; notification type could use z.enum for tighter response validation

### Learnings for future iterations
- The types barrel file (`shared/types/index.ts`) uses `export type { ... }` for interfaces/types but needs a separate `export { ... }` line for value exports like constants
- The root barrel (`shared/index.ts`) only exports auth and trip schemas/types — newer domains are only accessible via subpath imports (`@tripful/shared/types`, `@tripful/shared/schemas`)
- Response entity schemas use `z.date()` while TypeScript types use `string` for timestamps — this is a known inconsistency across the codebase, not worth fixing in isolation
- The shared package now has 216 total tests (up from 197 in iteration 1)

---

## Iteration 3 — Task 2.1: Create MessageService with CRUD, permissions, and reactions ✅

**Status**: COMPLETED

### What was done
- Created `apps/api/src/services/message.service.ts` — Full MessageService implementation with IMessageService interface and MessageService class (751 lines)
  - **Queries**: `getMessages` (paginated top-level messages with author profiles, reaction summaries with `reacted` flag via `bool_or()` SQL aggregate, 2 most recent replies per message, reply count, soft-deleted placeholders), `getMessageCount` (non-deleted top-level only), `getLatestMessage` (most recent non-deleted with author and reactions)
  - **Mutations**: `createMessage` (validates trip exists, going member, not locked, not muted, reply parent validation, 100 top-level limit), `editMessage` (author only, sets editedAt), `deleteMessage` (author or organizer, soft delete with deletedAt/deletedBy), `togglePin` (organizer only, top-level only), `toggleReaction` (add/remove toggle via existence check, returns updated summaries)
  - **Soft-delete placeholders**: `buildMessageResult` returns empty content and empty reactions for deleted messages while preserving envelope fields
- Created `apps/api/src/plugins/message-service.ts` — Fastify plugin following event-service pattern, depends on `['database', 'permissions-service']`
- Modified `apps/api/src/errors.ts` — Added 4 messaging error types: `MessageNotFoundError` (404), `MemberMutedError` (403), `MessageLimitExceededError` (409), `InvalidReplyTargetError` (400)
- Modified `apps/api/src/services/permissions.service.ts` — Added `mutedMembers` import and 5 new methods to both interface and implementation:
  - `canViewMessages` — delegates to `canViewFullTrip` (going member check)
  - `canPostMessage` — parallel check of canViewFullTrip + isTripLocked + isMemberMuted
  - `canModerateMessages` — delegates to `isOrganizer`
  - `canMuteMember` — organizer + target not organizer (parallel checks)
  - `isMemberMuted` — queries mutedMembers table
- Modified `apps/api/src/types/index.ts` — Added `IMessageService` import and `messageService` to FastifyInstance augmentation
- Modified `apps/api/src/app.ts` — Added messageServicePlugin import and registration
- Created `apps/api/tests/unit/message.service.test.ts` — 47 tests covering all service methods and permission checks

### Key implementation details
- Service uses internal result types with Date objects (MessageResult, MessageWithRepliesResult, ReactionSummaryResult) — NOT the shared Message type which has string dates for JSON serialization
- Reaction summaries use `sql<boolean>\`bool_or(${messageReactions.userId} = ${userId})\`` for efficient per-emoji `reacted` flag computation
- `getMessages` intentionally includes soft-deleted top-level messages (no `isNull(deletedAt)` filter) to return placeholders, while the count query only counts non-deleted messages
- `getLatestMessage` takes an extra `userId` parameter (deviating from architecture spec) to compute reaction summaries with `reacted` flag — justified deviation
- `createMessage` does granular permission checks (canViewMessages, isTripLocked, isMemberMuted) individually rather than using composite `canPostMessage`, to provide specific error types (PermissionDeniedError vs TripLockedError vs MemberMutedError)
- Reply validation: parent must exist, be in same trip, be top-level (parentId IS NULL), and not be deleted
- N+1 query pattern in `getMessages` (3 queries per top-level message + per-reply reactions) — acceptable for MVP with 100-message limit

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit`
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 850 API tests pass (47 new), 216 shared tests pass, all tests green
- **Message service tests**: ✅ 47/47 pass covering createMessage (8), editMessage (5), deleteMessage (4), togglePin (5), toggleReaction (5), getMessages (4), getMessageCount (3), getLatestMessage (2), permissions (11)

### Reviewer verdict: APPROVED
- All requirements from task spec met
- All 4 file modifications applied correctly
- Soft-deleted message placeholders implemented
- Thorough test coverage across all methods and error cases
- Code follows existing codebase conventions (ESM .js extensions, @/ path aliases, fastify-plugin pattern)
- 3 low-severity non-blocking notes: pagination count/data inconsistency for deleted messages, N+1 query pattern acceptable for MVP, `togglePin` reuses `InvalidReplyTargetError` for pin-on-reply case

### Learnings for future iterations
- When the coder agent creates new files, explicitly verify that ALL modifications to existing files were also applied — the coder can miss these
- The `bool_or()` SQL aggregate is available in PostgreSQL for computing boolean flags across grouped rows (useful for reaction summaries)
- Service methods should use granular permission checks when different error types are needed (e.g., PermissionDeniedError vs TripLockedError vs MemberMutedError)
- Tests use real PostgreSQL database (not mocks) — cleanup must respect FK dependency order: messageReactions → messages → mutedMembers → members → trips → users
- The API now has 850 total tests (up from 803 in iteration 2)

---

## Iteration 4 — Task 2.2: Create message API routes, controller, and integration tests ✅

**Status**: COMPLETED

### What was done
- Created `apps/api/src/controllers/message.controller.ts` — Message controller with 8 handler methods following the existing const-object pattern:
  - `listMessages` — GET /trips/:tripId/messages (paginated, maps service `data` to response `messages`)
  - `getMessageCount` — GET /trips/:tripId/messages/count
  - `getLatestMessage` — GET /trips/:tripId/messages/latest (nullable response)
  - `createMessage` — POST /trips/:tripId/messages (201 response)
  - `editMessage` — PUT /trips/:tripId/messages/:messageId
  - `deleteMessage` — DELETE /trips/:tripId/messages/:messageId (success-only response)
  - `togglePin` — PATCH /trips/:tripId/messages/:messageId/pin
  - `toggleReaction` — POST /trips/:tripId/messages/:messageId/reactions
- Created `apps/api/src/routes/message.routes.ts` — Route definitions with read/write split:
  - 3 GET routes with `authenticate` + `defaultRateLimitConfig` preHandlers
  - 5 write routes (POST/PUT/DELETE/PATCH) in scoped register with shared `authenticate`, `requireCompleteProfile`, and `writeRateLimitConfig` hooks
  - All routes include Zod schema validation for params, body, querystring, and responses
  - Local param schemas: `tripIdParamsSchema`, `messageParamsSchema` (tripId + messageId)
  - Pagination query schema with `z.coerce.number()` defaults (page=1, limit=20)
- Modified `apps/api/src/app.ts` — Added `messageRoutes` import and registration with `/api` prefix
- Created `apps/api/tests/integration/message.routes.test.ts` — 23 integration tests covering all 8 endpoints

### Key implementation details
- Controller delegates ALL permission logic to MessageService — no permission checks at the controller level
- The service returns `{ data, meta }` for getMessages; controller maps `data` to `messages` to match the response schema
- Routes use PATCH for pin toggle (not PUT as originally in architecture spec) to better match REST semantics for partial updates
- `messageParamsSchema` includes both `tripId` and `messageId` as UUID-validated params, keeping all message endpoints trip-scoped
- Response schemas use `z.date()` for timestamp fields; Fastify's Zod serializer handles Date→string conversion automatically
- The `members` table uses `isOrganizer: boolean` (not a `role` column) — integration tests set `isOrganizer: true` for organizer test users

### Test coverage (23 tests)
- **POST create** (6 tests): success, reply creation, 401 unauthenticated, 403 non-member, 400 invalid body, 403 muted member
- **GET list** (3 tests): paginated results, empty list, 401 unauthenticated
- **GET count** (1 test): correct count of top-level messages
- **GET latest** (2 tests): returns latest message, returns null when empty
- **PUT edit** (2 tests): edit own message, 403 for another user's message
- **DELETE** (2 tests): delete own message, organizer can delete another's message
- **PATCH pin** (2 tests): organizer can pin, 403 for non-organizer
- **POST reaction** (2 tests): add reaction, remove on second toggle
- **Trip lock** (3 tests): 403 for create/edit/delete on ended trips

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 873 API tests pass (23 new), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure)
- **Message route tests**: ✅ 23/23 pass

### Reviewer verdict: APPROVED
- All 8 endpoints from architecture spec implemented with correct HTTP methods, paths, auth, and schema validation
- Controller follows const-object pattern with standard error re-throw
- Routes correctly split read (GET + authenticate) and write (POST/PUT/DELETE/PATCH + authenticate + requireCompleteProfile) scopes
- Integration tests cover success paths, auth errors, permission errors, validation errors, and edge cases
- app.ts properly imports and registers routes with /api prefix
- 4 low-severity notes (non-blocking): minor param extraction placement inconsistency matching event controller, count endpoint doesn't verify membership at controller level (intentional for preview), no separate 401 tests for count/latest endpoints (covered by other endpoint tests), message ordering in test relies on DB round-trip latency

### Learnings for future iterations
- The `members` table uses `isOrganizer: boolean` field, not a `role: string` column — integration tests must use `isOrganizer: true` for organizer assertions
- Fastify's Zod serializer automatically handles `z.date()` ↔ Date object serialization — no manual date formatting needed
- Response schema mapping: when the service returns `{ data, meta }`, the controller must restructure to `{ success: true, messages: data, meta }` to match the response schema's field names
- Route PATCH is more appropriate than PUT for partial-update operations like pin toggling
- The API now has 873 total tests (up from 850 in iteration 3)

---

## Iteration 5 — Task 2.3: Implement mute/unmute with API routes and tests ✅

**Status**: COMPLETED

### What was done
- Modified `apps/api/src/errors.ts` — Added 3 new error types in the "Messaging errors" section:
  - `AlreadyMutedError` (409 Conflict)
  - `NotMutedError` (404 Not Found)
  - `CannotMuteOrganizerError` (403 Forbidden)
- Modified `apps/api/src/services/message.service.ts` — Added `mutedMembers` import from schema, 3 new error imports, 4 new methods to `IMessageService` interface and `MessageService` class:
  - `muteMember(tripId, memberId, mutedBy)` — checks `canMuteMember`, distinguishes non-organizer (PermissionDeniedError) from organizer-targeting-organizer (CannotMuteOrganizerError), checks already-muted (AlreadyMutedError), inserts into `mutedMembers` table
  - `unmuteMember(tripId, memberId, actorId)` — checks `isOrganizer` (PermissionDeniedError), checks currently muted (NotMutedError), deletes from `mutedMembers`
  - `isMuted(tripId, userId)` — delegates to `permissionsService.isMemberMuted`
  - `getMutedMembers(tripId)` — queries `mutedMembers` table, returns `{ userId, mutedBy, createdAt }[]`
- Modified `apps/api/src/controllers/message.controller.ts` — Added 2 new controller methods:
  - `muteMember` — POST handler, extracts `tripId` and `memberId` from params, returns `{ success: true }`
  - `unmuteMember` — DELETE handler, same pattern
- Modified `apps/api/src/routes/message.routes.ts` — Added `muteParamsSchema` (tripId + memberId UUID validation) and 2 new routes inside write scope (with authenticate + requireCompleteProfile + writeRateLimitConfig):
  - `POST /trips/:tripId/members/:memberId/mute`
  - `DELETE /trips/:tripId/members/:memberId/mute`
- Modified `apps/api/tests/unit/message.service.test.ts` — Added 11 new unit tests across 4 describe blocks:
  - `muteMember` (4 tests): success, AlreadyMutedError, CannotMuteOrganizerError, PermissionDeniedError
  - `unmuteMember` (3 tests): success, NotMutedError, PermissionDeniedError
  - `isMuted` (2 tests): true when muted, false when not
  - `getMutedMembers` (2 tests): returns list, returns empty array
- Modified `apps/api/tests/integration/message.routes.test.ts` — Added 9 new integration tests across 2 describe blocks:
  - `POST /api/trips/:tripId/members/:memberId/mute` (5 tests): 200 success, 409 already muted, 403 muting organizer, 403 non-organizer, 401 unauthenticated
  - `DELETE /api/trips/:tripId/members/:memberId/mute` (4 tests): 200 success, 404 not muted, 403 non-organizer, 401 unauthenticated

### Key implementation details
- The `muteMember` method uses a two-step permission check: first calls `canMuteMember(mutedBy, tripId, memberId)`, and if false, performs a follow-up `isOrganizer(mutedBy, tripId)` check to distinguish non-organizer (PermissionDeniedError) from organizer-targeting-organizer (CannotMuteOrganizerError)
- The `memberId` in URL params refers to the user ID (not the members table row ID), consistent with existing invitation route patterns
- Both routes are inside the write scope plugin, inheriting authenticate + requireCompleteProfile + writeRateLimitConfig hooks via scoped `addHook` calls
- `unmuteMember` only checks `isOrganizer` (not `canMuteMember`) since any organizer should be able to unmute any member regardless of target's role
- Neither `muteMember` nor `unmuteMember` check `isTripLocked` — these are moderation actions that should work regardless of trip lock status
- The existing cleanup function in unit tests already handles `mutedMembers` deletion, so no cleanup changes were needed

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 893 API tests pass (20 new), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)

### Reviewer verdict: APPROVED
- All requirements from task spec met: 4 service methods, 3 error types, 2 controller methods, 2 routes, 11 unit tests, 9 integration tests
- Correct permission logic with proper error type differentiation
- Controller and route patterns match existing codebase exactly
- Comprehensive test coverage across success paths, error paths, and auth scenarios
- 3 low-severity non-blocking notes: no `isTripLocked` check for mute/unmute (acceptable for moderation actions), 200 vs 201 for mute creation (consistent with delete pattern), edge case documentation

### Learnings for future iterations
- When `canMuteMember` returns false, a follow-up `isOrganizer` check is needed to distinguish between "not an organizer" and "target is organizer" — this two-step pattern is useful whenever a composite permission check needs to produce different error types
- Moderation actions (mute/unmute) are reasonably excluded from `isTripLocked` checks since they may need to work on past trips
- The `successResponseSchema` from `@tripful/shared/schemas` is reusable for any endpoint that returns `{ success: true }` without entity data
- Route params like `memberId` in `/trips/:tripId/members/:memberId/mute` refer to user IDs, not the members table PK — this is consistent across the codebase (invitation routes use the same pattern)
- The API now has 893 total tests (up from 873 in iteration 4)

---

## Iteration 6 — Task 3.1: Refactor SMS service and create NotificationService with preferences ✅

**Status**: COMPLETED

### What was done
- Refactored `apps/api/src/services/sms.service.ts` — Changed `ISMSService` interface from `sendVerificationCode(phoneNumber, code)` to `sendMessage(phoneNumber, message)`. Updated `MockSMSService` implementation to log `{ phoneNumber, message }` with label `"SMS Message Sent"`. SMS service is now a generic transport layer where callers format their own messages.
- Modified `apps/api/src/controllers/auth.controller.ts` — Updated caller to `smsService.sendMessage(e164PhoneNumber, \`Your Tripful verification code is: ${code}\`)` (line 57)
- Modified `apps/api/src/services/invitation.service.ts` — Updated caller to `smsService.sendMessage(phone, "You've been invited to a trip on Tripful!")` (line 285)
- Added `NotificationNotFoundError` to `apps/api/src/errors.ts` in a new "Notification errors" section (404 status)
- Created `apps/api/src/services/notification.service.ts` — Full `NotificationService` with `INotificationService` interface (~498 lines):
  - **Queries**: `getNotifications` (paginated with `tripId` filter, `unreadOnly` filter, returns `unreadCount`), `getUnreadCount`, `getTripUnreadCount`
  - **Mutations**: `markAsRead` (with ownership check, throws `NotificationNotFoundError`), `markAllAsRead` (with optional `tripId` scope)
  - **Creation & Delivery**: `createNotification` (inserts notification + sends SMS if preference allows), `notifyTripMembers` (queries going members, checks individual preferences, creates notifications + SMS, supports `excludeUserId`)
  - **Preferences**: `getPreferences` (returns defaults `{eventReminders: true, dailyItinerary: true, tripMessages: true}` when no row exists), `updatePreferences` (upsert via `onConflictDoUpdate`), `createDefaultPreferences` (idempotent via `onConflictDoNothing`)
  - **Private helper**: `shouldSendSms` maps notification type to preference field (`event_reminder`→`eventReminders`, `daily_itinerary`→`dailyItinerary`, `trip_message`→`tripMessages`, `trip_update`→always send)
- Created `apps/api/src/plugins/notification-service.ts` — Fastify plugin using `fastify-plugin` with dependencies `["database", "sms-service"]`, decorates `fastify.notificationService`
- Modified `apps/api/src/types/index.ts` — Added `INotificationService` import and `notificationService: INotificationService` to FastifyInstance augmentation
- Modified `apps/api/src/app.ts` — Added `notificationServicePlugin` import and registration after `messageServicePlugin`
- Rewrote `apps/api/tests/unit/sms.service.test.ts` — 7 tests for `sendMessage` interface (method existence, no-logger behavior, logger.info call, phone/message in log output, different message content, log label)
- Created `apps/api/tests/unit/notification.service.test.ts` — 32 tests covering all service methods:
  - `createNotification` (4 tests): basic creation, data field, global notification, SMS delivery
  - `getNotifications` (6 tests): pagination, tripId filter, unreadOnly filter, unreadCount, empty results, DESC ordering
  - `getUnreadCount` (2 tests): correct count, zero after read
  - `getTripUnreadCount` (2 tests): trip-scoped count, zero for different trip
  - `markAsRead` (3 tests): success, non-existent notification, wrong user
  - `markAllAsRead` (3 tests): all read, trip-scoped, user isolation
  - `notifyTripMembers` (5 tests): all going members, excludeUserId, preference-based SMS gating (positive + negative), SMS delivery verification
  - `getPreferences` (2 tests): stored values, defaults
  - `updatePreferences` (3 tests): upsert insert, upsert update, return values
  - `createDefaultPreferences` (2 tests): creation, idempotency

### Key implementation details
- NotificationService constructor takes `(db: AppDatabase, smsService: ISMSService)` — no PermissionsService needed since it directly queries members table for going status
- The `notifyTripMembers` method queries `members INNER JOIN users WHERE status='going'`, then iterates to create individual notifications via `createNotification`, which handles SMS delivery internally
- Preference-based SMS gating: for each notification type, checks if the user has preferences stored; if no row exists, defaults to all-true (send SMS). For `trip_update` type, always sends regardless of preferences.
- The `shouldSendSms` method handles the type-to-preference-field mapping and also accepts preferences with no row (defaults to true for all types)
- `updatePreferences` uses Drizzle's `onConflictDoUpdate` targeting `[notificationPreferences.userId, notificationPreferences.tripId]` for proper upsert
- `createDefaultPreferences` uses `onConflictDoNothing` for idempotency (safe to call multiple times)
- Internal `NotificationResult` uses `Date` objects (matching Drizzle return types); the controller layer (Task 3.2) will handle serialization to string dates

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 925 API tests pass (32 new notification + 7 rewritten SMS), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **No stale references**: Zero remaining `sendVerificationCode` references in apps/ directory

### Reviewer verdict: APPROVED
- All requirements from task spec met: SMS refactor complete, NotificationService complete, plugin registered, tests comprehensive
- SMS refactor correctly applied across all 3 source files (sms.service.ts, auth.controller.ts, invitation.service.ts) and test file
- NotificationService follows codebase patterns exactly (ESM .js extensions, @/ path aliases, fastify-plugin, error pattern)
- 32 unit tests cover all interface methods including edge cases (ownership checks, preference defaults, idempotency)
- 2 low-severity non-blocking notes: `totalPages` in `getNotifications` doesn't account for `unreadOnly` filter (acceptable UX tradeoff); `NotificationResult.data` uses `unknown` vs shared type's `Record<string, unknown> | null` (internal type, controller will handle mapping)

### Learnings for future iterations
- **CRITICAL**: When the coder agent creates new files, it may NOT apply edits to existing files. Always verify ALL modifications were actually applied — check each file listed in the task's "files to modify" list after the coder finishes. In this iteration, the coder created 3 new files correctly but missed all 7 existing file edits.
- The `onConflictDoUpdate` upsert in Drizzle targets columns (not constraint names) via array: `target: [table.col1, table.col2]`
- The `onConflictDoNothing()` with no arguments provides simple INSERT-or-skip idempotency
- Test files that instantiate `MockSMSService()` without directly calling/spying on the method (e.g., invitation.service.test.ts, update-member-role.test.ts) do NOT need updates when renaming the method — they pass through to the real implementation
- The API now has 925 total tests (up from 893 in iteration 5, +32 new notification tests)

---

## Iteration 7 — Task 3.2: Create notification API routes, controller, and integration tests ✅

**Status**: COMPLETED

### What was done
- Created `apps/api/src/controllers/notification.controller.ts` — Notification controller with 8 handler methods following the established const-object pattern:
  - `listNotifications` — GET /api/notifications (paginated, with unreadOnly and tripId query filters)
  - `getUnreadCount` — GET /api/notifications/unread-count (global unread count for bell badge)
  - `markAsRead` — PATCH /api/notifications/:notificationId/read (mark single notification read)
  - `markAllAsRead` — PATCH /api/notifications/read-all (mark all read, optional tripId body param for scoping)
  - `listTripNotifications` — GET /api/trips/:tripId/notifications (trip-scoped paginated list)
  - `getTripUnreadCount` — GET /api/trips/:tripId/notifications/unread-count (trip-scoped unread count)
  - `getPreferences` — GET /api/trips/:tripId/notification-preferences (returns defaults if none exist)
  - `updatePreferences` — PUT /api/trips/:tripId/notification-preferences (upserts preferences)
- Created `apps/api/src/routes/notification.routes.ts` — Route definitions with three-tier auth:
  - 5 GET routes with `authenticate` + `defaultRateLimitConfig` preHandlers
  - 2 PATCH mark-as-read routes with `authenticate` + `writeRateLimitConfig` (no requireCompleteProfile per architecture spec)
  - 1 PUT preferences route in scoped register with `authenticate` + `requireCompleteProfile` + `writeRateLimitConfig`
  - Local Zod schemas for params (tripIdParamsSchema, notificationIdParamsSchema), query (notificationQuerySchema, globalNotificationQuerySchema)
  - Response schemas imported from `@tripful/shared/schemas`
- Modified `apps/api/src/app.ts` — Added `notificationRoutes` import and registration with `/api` prefix after message routes
- Created `apps/api/tests/integration/notification.routes.test.ts` — 30 integration tests covering all 8 endpoints

### Key implementation details
- Routes use `:notificationId` param naming (more explicit than architecture spec's `:id`) for consistency with `:tripId`, `:messageId`, `:memberId`
- Three-tier auth middleware: GET routes need only `authenticate`, PATCH mark-as-read routes need `authenticate` + write rate limit, PUT preferences needs `authenticate` + `requireCompleteProfile` + write rate limit
- The `markAllAsRead` route does NOT define a body schema because Fastify's Zod validation rejects PATCH requests with no body when a body schema is defined (even if `.optional()`). The controller safely accesses `request.body?.tripId` instead.
- Controller maps service result to response shape: `{ data, meta, unreadCount }` → `{ success: true, notifications: data, meta, unreadCount }`
- Test helpers `createTestData()` and `createNotification()` reduce duplication in the 30 tests
- Used `...(tripId != null ? { tripId } : {})` spread pattern to satisfy `exactOptionalPropertyTypes` in TypeScript

### Test coverage (30 tests)
- **GET /api/notifications** (5 tests): paginated results, unreadOnly filter, empty list, tripId filter, 401 unauthenticated
- **GET /api/notifications/unread-count** (3 tests): correct count, zero count, 401 unauthenticated
- **PATCH /api/notifications/:notificationId/read** (4 tests): mark as read, 404 non-existent, 404 other user's, 401 unauthenticated
- **PATCH /api/notifications/read-all** (3 tests): mark all read with verification, tripId scoping, 401 unauthenticated
- **GET /api/trips/:tripId/notifications** (3 tests): trip-scoped list, cross-trip isolation, 401 unauthenticated
- **GET /api/trips/:tripId/notifications/unread-count** (3 tests): trip-scoped count, cross-trip isolation, 401 unauthenticated
- **GET /api/trips/:tripId/notification-preferences** (3 tests): defaults (all true), saved prefs, 401 unauthenticated
- **PUT /api/trips/:tripId/notification-preferences** (6 tests): create, update, invalid body, missing fields, 401 unauthenticated, 403 incomplete profile

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 955 API tests pass (30 new), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **Notification route tests**: ✅ 30/30 pass in 1924ms

### Reviewer verdict: APPROVED
- All 8 endpoints from architecture spec implemented with correct HTTP methods, paths, auth, and schema validation
- Controller follows const-object pattern with proper error handling
- Routes correctly implement three-tier auth (read, mark-as-read, write)
- Integration tests cover success paths, auth errors (401), permission errors (403), not-found errors (404), validation errors (400), and edge cases (empty results, filtering, cross-trip isolation)
- app.ts properly imports and registers routes with /api prefix
- 2 low-severity non-blocking notes: markAllAsRead body schema omitted for Fastify compatibility (controller handles safely), architecture spec deviation for trip-scoped unread count endpoint (logically needed for trip notification bell)

### Learnings for future iterations
- Fastify's Zod body schema validation rejects PATCH/POST requests with no Content-Type header when a body schema is defined, even if the schema is `.optional()`. For optional body params, it's safer to omit the body schema and handle it in the controller with `request.body?.field`.
- The `...(x != null ? { key: x } : {})` spread pattern satisfies `exactOptionalPropertyTypes` when passing optional fields to service methods
- Using descriptive param names (`:notificationId` vs `:id`) improves code readability and is consistent with the codebase convention
- The three-tier auth pattern (read-only, write-without-profile, write-with-profile) provides flexibility for endpoints that need mutation but shouldn't require profile completion (like marking notifications as read)
- The API now has 955 total tests (up from 925 in iteration 6, +30 new notification route tests)

---

## Iteration 8 — Task 3.3: Create SchedulerService for event reminders and daily itinerary ✅

**Status**: COMPLETED

### What was done
- Installed `date-fns-tz` (v3.2.0) and `date-fns` (v4.1.0) in `apps/api` via `pnpm add`
- Created `apps/api/src/services/scheduler.service.ts` — Full SchedulerService with ISchedulerService interface (~330 lines):
  - **Lifecycle**: `start()` creates two `setInterval` timers (5-min for event reminders, 15-min for daily itineraries) and runs both processors immediately on startup; `stop()` clears both timers
  - **processEventReminders()**: Queries events with `startTime` in 55-65 minute window from now, skips deleted and all-day events, joins with trips for trip name. For each event, gets going members, checks per-user `eventReminders` preference (defaults to true if no row), checks `sentReminders` for dedup (type='event_reminder', referenceId=eventId), creates notification via `notificationService.createNotification()`, inserts dedup record with `onConflictDoNothing()`
  - **processDailyItineraries()**: Queries active trips (not cancelled, with dates, current date in trip date range), uses `toZonedTime` from `date-fns-tz` to check if current time is 7:45-8:15 AM in trip's `preferredTimezone`. For matching trips, gets today's events, going members with `dailyItinerary=true`, dedup via sentReminders (referenceId=`{tripId}:{YYYY-MM-DD}`), creates notification with numbered event list body
- Created `apps/api/src/plugins/scheduler-service.ts` — Fastify plugin with dependencies `['database', 'notification-service', 'sms-service']`, skips `start()` when `NODE_ENV === 'test'`, registers `onClose` hook for cleanup
- Modified `apps/api/src/types/index.ts` — Added `ISchedulerService` import and `schedulerService: ISchedulerService` to FastifyInstance module augmentation
- Modified `apps/api/src/app.ts` — Added `schedulerServicePlugin` import and registration after `notificationServicePlugin`
- Created `apps/api/tests/unit/scheduler.service.test.ts` — 21 tests across 4 categories

### Key implementation details
- SchedulerService delegates SMS delivery entirely to `NotificationService.createNotification()` which handles SMS internally based on user preferences — the `_smsService` constructor parameter satisfies the plugin dependency chain without duplicating responsibility
- Event reminders: 55-65 minute lookahead window (10-min range covering the 5-min interval), using Drizzle `gte()` and `lte()` operators (first usage in the codebase)
- Daily itinerary morning window: 7:45-8:15 AM in trip timezone (30-min range covering the 15-min interval), using `toZonedTime()` from `date-fns-tz` v3
- Both process methods are fully stateless and idempotent — safe for manual invocation in tests and future migration to external schedulers (Lambda, EventBridge)
- Error handling: each member/trip iteration is wrapped in try/catch with logger.error() to prevent one failure from blocking remaining items; `start()` wraps immediate calls and interval callbacks in `.catch()`
- Daily itinerary fetches all non-deleted events per trip and filters to "today" in JavaScript (timezone-aware date filtering can't be done in SQL when timezone varies per trip) — acceptable for trip-planning app event counts
- Notification body formats: event reminders use `"{eventName} starts in 1 hour[ at {location}]"`, daily itinerary uses `"1. 9:00 AM - Event Name\n2. 12:00 PM - Another Event"`
- The scheduler is the first service with `start()`/`stop()` lifecycle methods and the first plugin that conditionally skips initialization based on `NODE_ENV`

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 976 API tests pass (21 new), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **Scheduler tests**: ✅ 21/21 pass covering:
  - processEventReminders (8 tests): window matching, dedup, preference respect, going-only members, deleted events, all-day events, location in body
  - processDailyItineraries (8 tests): morning window detection, dedup, preference respect, going-only members, cancelled trips, event list body, referenceId format
  - start/stop lifecycle (3 tests): interval creation, cleanup, safe stop without start
  - timezone handling (2 tests): morning window for different timezones, event filtering by today in trip timezone

### Reviewer verdict: APPROVED
- All requirements from task spec met
- Clean architecture with stateless/idempotent process methods
- Correct delegation of SMS through NotificationService
- Robust deduplication via sentReminders with onConflictDoNothing()
- Comprehensive error handling at both iteration and method levels
- Plugin follows all codebase conventions (fp, dependencies, onClose hook)
- Tests cover all specified areas (timing, deduplication, timezone)
- 2 low-severity non-blocking notes: unused _smsService parameter (exists for dependency chain), in-memory event date filtering (acceptable for trip-scale data)

### Learnings for future iterations
- `date-fns-tz` v3 API uses `toZonedTime()` (not `utcToZonedTime()` from v2) for converting UTC to a timezone
- `gte()` and `lte()` from `drizzle-orm` work for date range queries — this is their first usage in the codebase (existing code used only `eq`, `and`, `isNull`, `desc`, etc.)
- For timezone-dependent tests, use `vi.useFakeTimers()` with a fixed UTC time and a calculated timezone (e.g., `Etc/GMT+4` for UTC-4) to deterministically place local time in the morning window
- The `Etc/GMT±N` timezone convention has inverted signs: `Etc/GMT+4` = UTC-4, `Etc/GMT-2` = UTC+2
- Services that run on timers (not in request context) need their own error handling — wrap each iteration in try/catch and log errors rather than letting them propagate
- The scheduler is the first plugin to conditionally skip initialization based on NODE_ENV — uses `fastify.config.NODE_ENV !== 'test'` pattern
- `onConflictDoNothing()` is the correct pattern for idempotent dedup inserts (already used in NotificationService, now also in SchedulerService)
- The API now has 976 total tests (up from 955 in iteration 7, +21 new scheduler tests)

---

## Iteration 9 — Task 3.4: Hook message creation to notifications and RSVP to default preferences ✅

**Status**: COMPLETED

### What was done
- Modified `apps/api/src/services/message.service.ts` — Added `INotificationService` import and third constructor parameter `notificationService`. In `createMessage`, after successful top-level message insert (when `!data.parentId`), calls `notificationService.notifyTripMembers()` with:
  - `type: "trip_message"` (maps to `tripMessages` preference field)
  - `title: "New message in {tripName}"` (uses trip name from existing trip query)
  - `body: "{authorName}: {truncatedContent}"` (content truncated to 100 chars)
  - `excludeUserId: authorId` (author does not receive their own notification)
  - `data: { messageId: newMessage.id }` (for deep linking)
  - Wrapped in `try/catch` with empty catch block so notification failures never break message creation
- Modified `apps/api/src/services/invitation.service.ts` — Added `INotificationService` import and fourth constructor parameter `notificationService`. In `updateRsvp`, after the status update, added conditional: `if (status === "going") { await this.notificationService.createDefaultPreferences(userId, tripId); }`. Idempotent via `onConflictDoNothing()`.
- Modified `apps/api/src/plugins/message-service.ts` — Passed `fastify.notificationService` as 3rd constructor argument, added `"notification-service"` to dependencies array
- Modified `apps/api/src/plugins/invitation-service.ts` — Passed `fastify.notificationService` as 4th constructor argument, added `"notification-service"` to dependencies array
- Modified `apps/api/src/app.ts` — Moved `notificationServicePlugin` registration before both `invitationServicePlugin` and `messageServicePlugin` to satisfy new dependency chain
- Modified `apps/api/tests/unit/message.service.test.ts` — Updated constructor to include `NotificationService(db, new MockSMSService())`. Added `notifications` and `notificationPreferences` table cleanup in teardown.
- Modified `apps/api/tests/unit/invitation.service.test.ts` — Updated constructor to include `NotificationService(db, smsService)`. Added `notificationPreferences` table cleanup in teardown.
- Created `apps/api/tests/integration/notification-hooks.test.ts` — 5 integration tests covering cross-service hooks

### Key implementation details
- **Top-level only**: Notifications are only sent for top-level messages (`!data.parentId`), not replies. This is explicitly tested.
- **Error isolation**: The `notifyTripMembers` call in MessageService is wrapped in a bare `try/catch` block. If notification creation fails (DB error, SMS error, etc.), the message is still created and returned successfully.
- **RSVP preferences**: The `createDefaultPreferences` call is NOT wrapped in try/catch because the underlying method uses `onConflictDoNothing()` and is inherently safe. The reviewer noted this as a minor inconsistency but approved it as non-blocking.
- **Plugin dependency chain**: `notificationServicePlugin` must be registered before both `invitationServicePlugin` and `messageServicePlugin` in `app.ts`. Fastify's plugin system uses the `dependencies` array for ordering validation, and registration order in `app.ts` must match.
- **Notification body format**: Uses `"{authorName}: {content}"` with content truncated to 100 chars (97 + "..."). This provides a useful preview without storing full message content in notifications.

### Test coverage (5 new integration tests)
- **POST message → notifications** (1 test): Creates trip with 3 going members, posts top-level message as userA, verifies userB and userC each receive `trip_message` notification with correct `messageId` in data, and userA (author) does NOT receive one
- **POST reply → no notifications** (1 test): Posts a reply to an existing message, verifies zero new `trip_message` notifications are created
- **RSVP going → default preferences** (1 test): RSVPs to "going", verifies `notificationPreferences` row created with all defaults (eventReminders=true, dailyItinerary=true, tripMessages=true)
- **RSVP not_going → no preferences** (1 test): RSVPs to "not_going", verifies no `notificationPreferences` row exists
- **RSVP maybe → no preferences** (1 test): RSVPs to "maybe", verifies no `notificationPreferences` row exists

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 981 API tests pass (5 new), 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **Notification hooks tests**: ✅ 5/5 pass

### Reviewer verdict: APPROVED
- All 4 task requirements met: message→notification hook, RSVP→preferences hook, dependency injection, integration tests
- Error isolation correctly applied in MessageService (try/catch around notification call)
- Plugin registration order correct (notification-service before invitation-service and message-service)
- Integration tests cover all 5 required scenarios
- Existing unit tests properly updated with new constructor dependencies
- 1 medium-severity non-blocking note: `createDefaultPreferences` call in InvitationService not wrapped in try/catch (inconsistent with MessageService pattern, but acceptable since the method is idempotent via `onConflictDoNothing()`)
- 1 optional suggestion: add logging in the empty catch block for production debugging (deferred as it would require injecting a logger into the service)

### Learnings for future iterations
- When adding a new service dependency to an existing service, remember to update ALL three touchpoints: (1) service constructor, (2) plugin file (constructor args + dependencies array), (3) app.ts registration order
- Fastify plugin `dependencies` arrays declare what must be registered before the plugin, but the **registration order in app.ts must also match** — Fastify validates dependencies at registration time
- Cross-service side-effect calls should be error-isolated (try/catch) when the side effect is non-critical (notifications should not break message creation), but may be left un-wrapped when the operation is inherently safe (idempotent via `onConflictDoNothing()`)
- Unit test files that instantiate services with real implementations (not mocks) need their constructor calls updated when new dependencies are added — check ALL test files in `tests/unit/` that construct the modified services
- The API now has 981 total tests (up from 976 in iteration 8, +5 new notification hooks integration tests)

---

## Iteration 10 — Task 4.1: Create messaging TanStack Query hooks with optimistic updates ✅

**Status**: COMPLETED

### What was done
- Created `apps/web/src/hooks/message-queries.ts` — Server-safe module (no `"use client"`) with:
  - `messageKeys` query key factory with keys for: `all`, `lists`, `list(tripId)`, `count(tripId)`, `latest(tripId)`, `create`, `update`, `delete`, `pin`, `reaction`, `mute`, `unmute`
  - `messagesQueryOptions(tripId)` — returns full `GetMessagesResponse` (messages + meta) with 30s staleTime, `enabled: !!tripId`
  - `messageCountQueryOptions(tripId)` — returns `number` with 30s staleTime
  - `latestMessageQueryOptions(tripId)` — returns `Message | null` with 30s staleTime
- Created `apps/web/src/hooks/use-messages.ts` — Client-side `"use client"` module (~1028 lines) with:
  - **Query hooks**:
    - `useMessages(tripId, options?)` — paginated messages with 5s `refetchInterval` gated by `enabled` param
    - `useMessageCount(tripId)` — count with 30s `refetchInterval` polling
    - `useLatestMessage(tripId)` — latest message with 30s `refetchInterval` polling
  - **Mutation hooks with full optimistic updates** (onMutate → onError rollback → onSettled invalidation):
    - `useCreateMessage(tripId)` — optimistic add with temp ID to messages list, count +1, latest cache update
    - `useEditMessage(tripId)` — optimistic content + editedAt update (handles both top-level and replies)
    - `useDeleteMessage(tripId)` — optimistic soft delete (sets deletedAt, clears content, does NOT remove from list)
    - `useToggleReaction(tripId)` — optimistic toggle using `toggleReactionInList` helper (add/remove/increment/decrement)
    - `usePinMessage(tripId)` — optimistic isPinned toggle
  - **Simple mutations** (no optimistic update):
    - `useMuteMember(tripId)` — POST mute, invalidates `memberKeys.list` on settle
    - `useUnmuteMember(tripId)` — DELETE mute, invalidates `memberKeys.list` on settle
  - **Error helper functions** (one per mutation):
    - `getCreateMessageErrorMessage` — PERMISSION_DENIED, MEMBER_MUTED, MESSAGE_LIMIT_EXCEEDED, INVALID_REPLY_TARGET, NOT_FOUND, VALIDATION_ERROR, UNAUTHORIZED
    - `getEditMessageErrorMessage` — PERMISSION_DENIED, MESSAGE_NOT_FOUND, MEMBER_MUTED, VALIDATION_ERROR, UNAUTHORIZED
    - `getDeleteMessageErrorMessage` — PERMISSION_DENIED, MESSAGE_NOT_FOUND, UNAUTHORIZED
    - `getToggleReactionErrorMessage` — PERMISSION_DENIED, MESSAGE_NOT_FOUND, MEMBER_MUTED, VALIDATION_ERROR, UNAUTHORIZED
    - `getPinMessageErrorMessage` — PERMISSION_DENIED, MESSAGE_NOT_FOUND, UNAUTHORIZED
    - `getMuteMemberErrorMessage` — PERMISSION_DENIED, ALREADY_MUTED, CANNOT_MUTE_ORGANIZER, NOT_FOUND, UNAUTHORIZED
    - `getUnmuteMemberErrorMessage` — PERMISSION_DENIED, NOT_MUTED, NOT_FOUND, UNAUTHORIZED
  - Re-exports of all `message-queries.ts` exports + types for backward compatibility

### Key implementation details
- Follows the established two-file pattern (`*-queries.ts` + `use-*.ts`) matching `event-queries.ts`/`use-events.ts` and `invitation-queries.ts`/`use-invitations.ts`
- `messagesQueryOptions` returns the full `GetMessagesResponse` (messages + meta with pagination info), not just the messages array — consumers need pagination meta for "Load more" UI
- Optimistic create builds a full `MessageWithReplies` with `id: "temp-" + Date.now()`, empty replies array, replyCount 0, and placeholder author info
- Optimistic delete sets `deletedAt` and clears `content` to empty string (soft delete placeholder), does NOT remove from list — matching backend behavior where soft-deleted messages appear as placeholders
- `toggleReactionInList` pure helper handles all three cases: (1) user already reacted → decrement count, set reacted=false, remove if count=0; (2) emoji exists but user hasn't reacted → increment, set reacted=true; (3) new emoji → append new ReactionSummary entry
- `useEditMessage`, `useDeleteMessage`, and `useToggleReaction` all traverse both top-level messages AND their nested `.replies[]` arrays for thorough optimistic cache updates
- Cross-query invalidation: create/delete invalidate list + count + latest; edit/pin/reaction invalidate list only
- `memberKeys` imported from `./invitation-queries` for mute/unmute cache invalidation (that's where memberKeys is defined and exported)
- This is the first use of `refetchInterval` in the codebase — a new pattern for messaging-specific polling

### Verification results
- **TypeScript**: ✅ All 3 packages pass `tsc --noEmit` with zero errors
- **ESLint**: ✅ All 3 packages pass with zero errors
- **Tests**: ✅ 981 API tests pass, 216 shared tests pass, 855/856 web tests pass (1 pre-existing failure in accommodation-card.test.tsx unrelated to our changes)
- **Git status**: ✅ Only 2 untracked files, zero existing files modified

### Reviewer verdict: APPROVED
- All 10 required hooks implemented per architecture spec
- Two-file split with `"use client"` directive correctly applied
- Polling intervals correct (5s messages, 30s count/latest)
- Optimistic updates follow correct three-step pattern (onMutate → onError rollback → onSettled invalidation)
- Simple mutations for mute/unmute (no optimistic update, matching invitation pattern)
- Error helper functions provided for each mutation with correct error codes
- Re-exports from use-messages.ts present for backward compatibility
- 3 low-severity non-blocking notes: (1) key factory uses flat structure matching codebase convention over architecture spec pseudo-code; (2) usePinMessage doesn't traverse replies for optimistic update (pinning is top-level only per spec); (3) useDeleteMessage doesn't optimistically decrement count (soft delete placeholder remains in list, count will sync on onSettled)

### Learnings for future iterations
- `refetchInterval` is a new pattern in this codebase, introduced for messaging polling (5s for message feed, 30s for count/latest) — future features may reference this pattern
- The two-file split pattern (`*-queries.ts` for server-safe + `use-*.ts` for client hooks) is consistent across all domains and should always be followed for new hook files
- `memberKeys` is exported from `invitation-queries.ts`, not from a dedicated member queries file — this is the existing convention for member-related query keys
- For paginated endpoints, returning the full response object (including `meta`) from `queryOptions` is more flexible than extracting just the data array — consumers can access pagination info for load-more/infinite-scroll UI
- Optimistic updates for deeply nested data (messages → replies) require traversing both levels of the data structure — all mutations that can target replies must include the nested `.replies.map()` logic
- No new tests were needed for this task since the task spec only requires `pnpm typecheck` verification — hook tests will be added if specified in a future task
