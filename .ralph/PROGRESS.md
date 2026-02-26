# Progress: Skill Audit Remediation

## Iteration 1 — Task 1.1: Create security and rate limiting database tables with partial indexes

**Status**: ✅ COMPLETE

### Changes Made

**Files modified:**
- `apps/api/src/db/schema/index.ts` — Added `integer` to drizzle-orm/pg-core imports; added 3 new tables (`blacklistedTokens`, `authAttempts`, `rateLimitEntries`); added 4 partial indexes on existing soft-delete tables
- `apps/api/src/db/schema/relations.ts` — Added `blacklistedTokens` import, `blacklistedTokensRelations` definition, updated `usersRelations` with `blacklistedTokens: many(blacklistedTokens)`

**Files generated:**
- `apps/api/src/db/migrations/0017_third_maelstrom.sql` — Migration with 3 CREATE TABLE, 7 CREATE INDEX (4 partial), 1 FK constraint

### New Tables
1. **`blacklisted_tokens`** — UUID PK, unique `jti` text, `userId` FK to users (cascade), `expiresAt`, `createdAt` + indexes on jti and expiresAt
2. **`auth_attempts`** — `phone_number` text PK, `failedCount` integer default 0, `lastFailedAt`, `lockedUntil` timestamps
3. **`rate_limit_entries`** — `key` text PK, `count` integer default 0, `expiresAt` timestamp + index on expiresAt

### Partial Indexes Added
- `events_trip_id_not_deleted_idx` — on `trip_id` WHERE `deleted_at IS NULL`
- `accommodations_trip_id_not_deleted_idx` — on `trip_id` WHERE `deleted_at IS NULL`
- `member_travel_trip_id_not_deleted_idx` — on `trip_id` WHERE `deleted_at IS NULL`
- `messages_trip_id_not_deleted_idx` — on `trip_id` WHERE `deleted_at IS NULL AND parent_id IS NULL`

### Verification
- **TypeCheck**: PASS (all 3 packages)
- **Lint**: PASS (1 pre-existing warning in verification.service.test.ts, unrelated)
- **Unit/Integration Tests**: PASS (shared: 231 tests, api: all pass, web: 1169 tests)
- **Reviewer**: APPROVED

### Learnings
- Codebase uses `(table) => ({...})` object syntax for index callbacks, NOT the array syntax `(t) => [...]` shown in some Drizzle docs
- UUID column ordering is `.primaryKey().defaultRandom()` (not reversed)
- Existing partial index pattern uses `sql` template literals with `.where()` on the index builder
- The `_journal.json` file for drizzle-kit migrations is auto-maintained
- `authAttempts` and `rateLimitEntries` are the first tables with text-based PKs (all others use UUID)
