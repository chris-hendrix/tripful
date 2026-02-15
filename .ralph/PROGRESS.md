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
