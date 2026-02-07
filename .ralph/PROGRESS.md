# Ralph Progress

Tracking implementation progress for this project.

## Iteration 1 — Task 1.1: Refactor to Fastify plugin architecture with buildApp extraction and graceful shutdown

**Status**: ✅ COMPLETE (Reviewer: APPROVED)

### What Was Done
Refactored the monolithic `apps/api/src/server.ts` into a proper Fastify plugin architecture:

1. **Created `src/app.ts`** — `buildApp()` factory function that creates and configures the Fastify instance with all plugins, middleware, and routes. Used by both production server and tests.

2. **Created 8 Fastify plugins** in `src/plugins/`:
   - `config.ts` — decorates `fastify.config` with validated env config
   - `database.ts` — decorates `fastify.db` with Drizzle instance, adds onClose hook
   - `auth-service.ts` — decorates `fastify.authService` with JWT access (eliminates `new AuthService(request.server)` workaround)
   - `trip-service.ts` — decorates `fastify.tripService`
   - `permissions-service.ts` — decorates `fastify.permissionsService`
   - `upload-service.ts` — decorates `fastify.uploadService`
   - `sms-service.ts` — decorates `fastify.smsService` with logger injection
   - `health-service.ts` — decorates `fastify.healthService`

3. **Refactored `server.ts`** — Slimmed from 128 to ~55 lines, uses `buildApp()` + `close-with-grace` for graceful shutdown

4. **Updated all controllers** — Access services via `request.server.*` instead of singleton imports

5. **Updated middleware** — `auth.middleware.ts` uses `request.server.db` instead of importing `db` directly

6. **Added type augmentation** — `declare module "fastify"` in `types/index.ts` for all decorated properties

7. **Replaced console.log/console.error** — All replaced with structured pino logging (except `config/env.ts` which runs before Fastify)

8. **Unified test helpers** — `tests/helpers.ts` imports `buildApp` from `@/app.js` with test-specific overrides

9. **Installed dependencies** — `fastify-plugin`, `close-with-grace`, `pino-pretty` (devDep)

### Verification Results
- **TypeScript**: PASS (0 errors)
- **Tests**: PASS (790 total: 343 API, 83 shared, 364 web — 0 failures)
- **Lint**: PASS (0 errors)
- **Structural checks**: All pass (buildApp export, plugins directory, close-with-grace, helpers import, console.log removal)

### Reviewer Notes
- APPROVED with only LOW severity observations:
  - Services still import `db` directly from singleton module (intentional — full DI deferred to future task)
  - Singleton exports remain in service files (backward compatibility, unused by controllers)
  - Logger interface duplicated in sms.service.ts and database.ts (minor, could consolidate later)

### Learnings for Future Iterations
- **Pragmatic approach works**: Keeping service internals unchanged (still importing `db` singleton) while wrapping them as plugins avoids massive churn. Controllers now use decorators. Full DI can come later.
- **Test helpers re-export pattern**: The backward-compatible `export { buildTestApp as buildApp }` in tests/helpers.ts means no test import changes needed.
- **Auth middleware test needed db decoration**: Tests with custom `buildTestApp()` (like auth.middleware.test.ts) need explicit `app.decorate("db", db)` since middleware now uses `request.server.db`.
- **Process.stderr.write for pre-Fastify logging**: In `jwt.ts`, `process.stderr.write` is appropriate when the Fastify logger isn't available yet.

## Iteration 2 — Task 2.1: Add Drizzle relations, unique constraint, transactions, count aggregate, pagination, and column selection

**Status**: ✅ COMPLETE (Reviewer: APPROVED)

### What Was Done

Improved the Tripful API's Drizzle ORM usage with relations, constraints, transactions, aggregates, pagination, and query optimization:

1. **Created `src/db/schema/relations.ts`** — Drizzle ORM relations for users, trips, and members tables (`usersRelations`, `tripsRelations`, `membersRelations`) enabling the `db.query.*` relational API.

2. **Added unique constraint on `members(trip_id, user_id)`** — Prevents duplicate trip memberships at the database level. Migration `0002_mysterious_hercules.sql` generated and applied.

3. **Passed schema to `drizzle()` in `config/database.ts`** — Merged table schema + relations into `fullSchema`, passed to `drizzle(pool, { schema: fullSchema })`. Updated Fastify type augmentation in `types/index.ts` to `NodePgDatabase<FullSchema>`.

4. **Wrapped `createTrip()` in `db.transaction()`** — Trip insert + creator member insert + co-organizer member inserts are now atomic. If any insert fails, the entire operation rolls back.

5. **Wrapped `addCoOrganizers()` in `db.transaction()`** — Member count check + duplicate filter + inserts are atomic, preventing TOCTOU race conditions on the 25-member limit.

6. **Wrapped `cancelTrip()` in `db.transaction()`** — For consistency (single UPDATE, but future-proofed for additional operations).

7. **Fixed `getMemberCount()` to use SQL `COUNT(*)`** — Replaced fetch-all-then-count-in-JS with `select({ value: count() })`. Same fix applied to pagination total count.

8. **Added pagination to `getUserTrips()`** — Accepts `page` and `limit` params, returns `{ data: TripSummary[], meta: { total, page, limit, totalPages } }`. Controller parses query params with clamping (page >= 1, 1 <= limit <= 100).

9. **Fixed N+1 query in `getUserTrips()`** — Replaced per-trip loop (3 queries per trip) with batch queries: one query for all members, one for all organizer users. Reduces from O(3N) to O(3) queries.

10. **Added column selection in auth middleware** — `requireCompleteProfile` now selects only `{ id, displayName }` instead of `SELECT *` on the hot path.

11. **Created 5 new integration tests** in `tests/integration/drizzle-improvements.test.ts` covering unique constraint, pagination (default + custom params), transaction atomicity, and count aggregate.

12. **Updated all existing tests** — Unit tests (`trip.service.test.ts`) and integration tests (`trip.routes.test.ts`) updated for the new paginated response shape (`body.data`/`body.meta` instead of `body.trips`).

### Files Changed
- `src/db/schema/relations.ts` — Created (Drizzle relations)
- `src/db/schema/index.ts` — Modified (unique constraint, `unique` import)
- `src/db/migrations/0002_mysterious_hercules.sql` — Generated (unique constraint migration)
- `src/config/database.ts` — Modified (schema + relations passed to drizzle())
- `src/types/index.ts` — Modified (db type updated to `NodePgDatabase<FullSchema>`)
- `src/services/trip.service.ts` — Modified (transactions, count aggregate, pagination, N+1 fix)
- `src/controllers/trip.controller.ts` — Modified (pagination query params, new response shape)
- `src/middleware/auth.middleware.ts` — Modified (column selection)
- `tests/integration/drizzle-improvements.test.ts` — Created (5 new tests)
- `tests/unit/trip.service.test.ts` — Modified (pagination assertions)
- `tests/integration/trip.routes.test.ts` — Modified (response shape assertions)

### Verification Results
- **TypeScript**: PASS (0 errors across all 3 packages)
- **Tests**: PASS (795 total: 348 API, 83 shared, 364 web — 0 failures)
- **Lint**: PASS (0 errors)
- **Structural checks**: All 9 pass (relations file, unique constraint, migration, schema in drizzle, 3 transactions, count aggregate, pagination, column selection, new tests)

### Reviewer Notes
- APPROVED with only LOW severity observations:
  - Redundant composite index: `tripUserIdx` and `tripUserUnique` are on the same columns — PostgreSQL auto-creates an index for unique constraints, making the explicit index redundant. Left as-is to avoid an extra migration.
  - `cancelTrip` transaction wraps a single UPDATE which is already atomic — kept for consistency and future-proofing.
  - GET `/api/trips` response shape changed from `{ success, trips }` to `{ success, data, meta }` — breaking change for frontend consumers (acceptable in early development).

### Learnings for Future Iterations
- **Schema merging for drizzle**: drizzle-kit v0.28.1 uses CJS require and cannot resolve `.js` extensions to `.ts` in `export * from "./relations.js"`. Solution: import relations separately in `database.ts` and merge with spread `{ ...schema, ...relations }`.
- **FullSchema type pattern**: Using `typeof schema & typeof relations` type intersection works well for Fastify type augmentation when tables and relations are in separate files.
- **Batch queries over relational API**: For `getUserTrips`, explicit batch queries with Maps are more efficient and predictable than the Drizzle relational API for complex aggregations (member counts + organizer info + pagination).
- **Count aggregate returns number**: Drizzle's `count()` from `drizzle-orm` returns a properly typed number, accessed as `result.value` when aliased with `select({ value: count() })`.
- **Pagination math**: `totalPages = Math.ceil(total / limit)` and `offset = (page - 1) * limit` — standard offset-based pagination. Controller clamps inputs to prevent invalid values.
- **Breaking API change management**: The response shape change from `{ trips }` to `{ data, meta }` needs frontend consumer updates. In a real production system, this would need versioning or a migration period.

