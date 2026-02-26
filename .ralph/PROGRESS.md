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

## Iteration 2 — Task 1.2: Implement PostgreSQL-backed rate limit store with cleanup job

**Status**: ✅ COMPLETE

### Changes Made

**Files created:**
- `apps/api/src/plugins/pg-rate-limit-store.ts` — Factory function `createPgRateLimitStoreClass(db)` that returns a store class for `@fastify/rate-limit`. Uses atomic UPSERT (INSERT...ON CONFLICT DO UPDATE) with inline window expiry reset. Implements `incr()` (callback-based, handles the 4-arg runtime signature) and `child()` for per-route stores.
- `apps/api/tests/unit/pg-rate-limit-store.test.ts` — 7 unit tests: first increment, sequential increments, expired window reset, concurrent access (5 parallel), child store, timeWindow override via incr arg, string timeWindow fallback
- `apps/api/tests/integration/pg-rate-limit-store.test.ts` — 3 integration tests: requests within limit succeed, 429 when exceeded, rate limit headers present

**Files modified:**
- `apps/api/src/app.ts` — Added import of `createPgRateLimitStoreClass`, wired PG store to `@fastify/rate-limit` registration, removed unused `cache` option (inert with custom store)
- `apps/api/src/queues/types.ts` — Added `RATE_LIMIT_CLEANUP` and `AUTH_ATTEMPTS_CLEANUP` queue names
- `apps/api/src/queues/index.ts` — Added `sql` import from drizzle-orm, registered hourly cron jobs for rate_limit_entries cleanup (deletes expired rows) and auth_attempts cleanup (deletes entries older than 24h)
- `apps/api/tests/setup.ts` — Added rate_limit_entries cleanup in beforeAll to prevent stale PG-backed state from causing unexpected 429s in tests

### Key Design Decisions
1. **Factory closure pattern** for DB injection — `@fastify/rate-limit` instantiates stores via `new Store(options)`, so DB must be captured in closure rather than passed to constructor
2. **ES private field (`#timeWindow`)** instead of TypeScript `private` — required because TypeScript disallows `private` on exported anonymous class types (TS4094)
3. **`object` type for `child()` parameter** — `@fastify/rate-limit` passes `RouteOptions & { path, prefix }` which doesn't satisfy `Record<string, unknown>` due to missing index signatures, but does extend `object`
4. **Inline cleanup workers** in `queues/index.ts` — simple DELETE queries don't warrant separate worker files

### Verification
- **TypeCheck**: PASS (all 3 packages)
- **Lint**: PASS (0 errors, 1 pre-existing warning)
- **Unit/Integration Tests**: PASS (127 files, 2446 tests, 0 failures)
- **Reviewer**: APPROVED

### Learnings
- `@fastify/rate-limit` TypeScript types for `incr()` declare 2 params but runtime passes 4: `(key, callback, timeWindow, max)` — implementation must accept extra optional params
- TypeScript `private` keyword is not allowed on anonymous class expressions returned from exported functions (TS4094) — use ES `#private` fields instead
- `Record<string, unknown>` is NOT a supertype of TypeScript interfaces (interfaces lack index signatures) — use `object` type when needing a general object supertype
- PG-backed rate limit stores persist state between test runs — test setup must clean the table to avoid 429s leaking across test suites
- The `cache` option on `@fastify/rate-limit` only applies to the built-in `LocalStore` and is silently ignored with custom stores
