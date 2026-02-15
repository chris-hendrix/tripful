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
