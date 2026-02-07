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

## Iteration 3 — Task 3.1: Add Zod route schemas, @fastify/error typed errors, helmet, rate limiting, and security hardening

**Status**: ✅ COMPLETE (Reviewer: APPROVED)

### What Was Done

Replaced string-based error handling with typed errors, added Zod route schemas for automatic validation, and hardened the API with security headers and rate limiting:

1. **Created `src/errors.ts`** — 12 typed error classes using `@fastify/error`'s `createError()`: `UnauthorizedError`, `ProfileIncompleteError`, `TripNotFoundError`, `PermissionDeniedError`, `MemberLimitExceededError`, `CoOrganizerNotFoundError`, `CannotRemoveCreatorError`, `DuplicateMemberError`, `CoOrganizerNotInTripError`, `FileTooLargeError`, `InvalidFileTypeError`, `InvalidCodeError`. Each has a proper HTTP status code and error code.

2. **Updated services to throw typed errors** — `trip.service.ts` (16 error sites), `upload.service.ts` (2 error sites) now throw typed errors instead of `throw new Error("string")`. Internal invariant errors (e.g., "Failed to create trip") kept as generic `Error` since they become 500s.

3. **Updated error middleware** — Added handling for `@fastify/error` typed errors (detected via `statusCode < 500 && code`), wrapping them in the standard `{ success: false, error: { code, message } }` envelope. Also added `hasZodFastifySchemaValidationErrors` handling for Zod route schema validation errors.

4. **Removed manual `safeParse()` from controllers** — All 12 `schema.safeParse(request.body)` / `uuidSchema.safeParse(id)` calls removed from `auth.controller.ts` and `trip.controller.ts`. Fastify route schemas now handle validation automatically.

5. **Removed string-based error matching from controllers** — All `error.message.startsWith(...)` / `error.message === ...` patterns in catch blocks replaced with typed error re-throw: `if (error && typeof error === "object" && "statusCode" in error) { throw error; }`.

6. **Added Zod route schemas to all routes** — `auth.routes.ts` (3 routes with body schemas), `trip.routes.ts` (8 routes with params/body schemas). Multipart routes correctly skip body schema. Set up `validatorCompiler` and `serializerCompiler` from `fastify-type-provider-zod` in `app.ts`.

7. **Registered `@fastify/helmet`** — Security headers with `contentSecurityPolicy: false` (API-only server).

8. **Added rate limiting to verify-code** — 10 attempts per 15 minutes per phone number via `verifyCodeRateLimitConfig` in `rate-limit.middleware.ts`.

9. **Registered `@fastify/under-pressure`** — Load shedding with sensible defaults (1s event loop delay, 1GB heap, 1.5GB RSS).

10. **Added `setNotFoundHandler`** — Consistent 404 responses for unknown routes in the standard error envelope format.

11. **Added `TRUST_PROXY` env variable** — Boolean (default false) in `config/env.ts`, used in Fastify constructor for correct `request.ip` behind load balancers.

12. **Created 9 new integration tests** in `tests/integration/security.test.ts` — schema validation (invalid UUID, missing body), security headers (helmet), not-found handler, rate limiting on verify-code, error envelope consistency.

13. **Updated existing tests** — `trip.routes.test.ts` updated `FORBIDDEN` → `PERMISSION_DENIED` for cover image permission errors, validation message format updates for schema-driven validation, `VALIDATION_ERROR` → `INVALID_FILE_TYPE` for file type checks.

### Files Changed

- `src/errors.ts` — Created (12 typed error classes)
- `src/app.ts` — Modified (helmet, under-pressure, zod compilers, not-found handler, trust proxy)
- `src/config/env.ts` — Modified (TRUST_PROXY env variable)
- `src/middleware/error.middleware.ts` — Modified (typed error + Zod validation handling)
- `src/middleware/rate-limit.middleware.ts` — Modified (verify-code rate limit config)
- `src/services/trip.service.ts` — Modified (typed errors)
- `src/services/upload.service.ts` — Modified (typed errors)
- `src/controllers/auth.controller.ts` — Modified (removed safeParse, typed error handling)
- `src/controllers/trip.controller.ts` — Modified (removed safeParse, string matching, simplified catch blocks)
- `src/routes/auth.routes.ts` — Modified (Zod route schemas, verify-code rate limit)
- `src/routes/trip.routes.ts` — Modified (Zod route schemas for params/body)
- `tests/integration/security.test.ts` — Created (9 new tests)
- `tests/integration/trip.routes.test.ts` — Modified (error code updates)
- `package.json` — Modified (new dependencies)
- `pnpm-lock.yaml` — Updated

### Verification Results

- **TypeScript**: PASS (0 errors across all 3 packages)
- **Tests**: PASS (804 total: 357 API, 83 shared, 364 web — 0 failures)
- **Lint**: PASS (0 errors)
- **Structural checks**: All 17 pass (errors.ts, helmet, under-pressure, not-found handler, TRUST_PROXY, no safeParse in controllers, no string error matching in controllers, Zod compilers, route schemas, security tests, verify-code rate limit, typed errors in services, packages installed)

### Reviewer Notes

- APPROVED with only LOW severity observations:
  - `TripNotFoundError` and `CoOrganizerNotInTripError` share error code `NOT_FOUND` — acceptable, differentiated by message
  - `DuplicateMemberError` defined but not yet used (pre-defined for future constraint handling)
  - `GET /api/trips` querystring (page/limit) still manually parsed in controller rather than via route schema — functional, non-blocking
  - `as` type casts on `request.body`/`request.params` remain since handlers are separate functions without generic type params — idiomatic Fastify pattern when not using inline handlers

### Learnings for Future Iterations

- **`fastify-type-provider-zod` v4 for Zod 3 compatibility**: The codebase uses Zod 3.24.1. The `@fastify/type-provider-zod` v6+ requires Zod 4. Using `fastify-type-provider-zod@4.0.2` (community package) provides Zod 3 compatibility.
- **`hasZodFastifySchemaValidationErrors` for error detection**: The `fastify-type-provider-zod` package exports `hasZodFastifySchemaValidationErrors(error)` to distinguish Zod schema validation errors from other Fastify errors in the error handler.
- **Typed error re-throw pattern**: In controller catch blocks, checking `"statusCode" in error` and re-throwing lets typed errors propagate to the centralized error handler while keeping 500 fallback for unexpected errors.
- **Multipart routes skip body schema**: Routes using `@fastify/multipart` (cover-image upload) cannot use JSON body schemas since the body is a multipart stream. Only params schema applies.
- **Error code backward compatibility**: Using `NOT_FOUND` instead of `TRIP_NOT_FOUND` preserved existing test expectations. When introducing typed errors, matching existing error codes minimizes test churn.
- **Controller code reduction**: Removing manual `safeParse()` and string-based error matching significantly reduced controller boilerplate (trip controller from ~970 to ~620 lines). Centralized error handling is cleaner.
- **Rate limit test isolation**: Tests for route-specific rate limits need their own app instance without global rate limit disabled (`buildApp({ fastify: { logger: false } })` without `rateLimit: { global: false }`).

## Iteration 4 — Task 4.1: Add explicit config flags, logger improvements, scoped hooks, multipart limits, and health checks

**Status**: ✅ COMPLETE (Reviewer: APPROVED)

### What Was Done

Replaced environment-dependent behavior with explicit config flags, improved logging, refactored route auth hooks, and added Kubernetes-style health check endpoints:

1. **Added 3 new config flags** to `config/env.ts`:
   - `COOKIE_SECURE` — `z.coerce.boolean().default(process.env.NODE_ENV === "production")` — controls cookie `secure` flag
   - `EXPOSE_ERROR_DETAILS` — `z.coerce.boolean().default(process.env.NODE_ENV === "development")` — controls error message/stack exposure
   - `ENABLE_FIXED_VERIFICATION_CODE` — `z.coerce.boolean().default(process.env.NODE_ENV !== "production")` — controls fixed "123456" code for dev/test

2. **Replaced all `process.env.NODE_ENV` checks** in source code (4 locations):
   - `auth.controller.ts` (2 locations): cookie `secure` flag → `request.server.config.COOKIE_SECURE`
   - `error.middleware.ts`: error detail exposure → `request.server.config.EXPOSE_ERROR_DETAILS`
   - `auth.service.ts`: fixed verification code → `this.fastify?.config.ENABLE_FIXED_VERIFICATION_CODE`
   - `utils/phone.ts`: test phone acceptance → `env.ENABLE_FIXED_VERIFICATION_CODE`

3. **Replaced all `process.cwd()` calls** with `import.meta.dirname` (3 locations):
   - `config/jwt.ts`: `resolve(import.meta.dirname, "..", "..", ".env.local")`
   - `app.ts`: `resolve(import.meta.dirname, "..", app.config.UPLOAD_DIR)`
   - `services/upload.service.ts`: `resolve(import.meta.dirname, "..", "..", env.UPLOAD_DIR)`

4. **Added logger redaction and pino-pretty** in `server.ts`:
   - Development: `pino-pretty` transport with `debug` level
   - Non-development: `redact` array for `req.headers.authorization`, `req.headers.cookie`, `req.body.phoneNumber`

5. **Refactored trip.routes.ts with scoped auth hooks**:
   - GET routes (`GET /`, `GET /:id`) remain at top level with only `preHandler: authenticate`
   - Write routes (POST, PUT, DELETE — 7 routes) wrapped in `fastify.register(async (scope) => { ... })` with `scope.addHook("preHandler", authenticate)` and `scope.addHook("preHandler", requireCompleteProfile)`

6. **Added multipart limits** in `app.ts`:
   - `throwFileSizeLimit: true`, `fieldNameSize: 100`, `fields: 10`, `headerPairs: 2000`

7. **Added health check endpoints**:
   - `GET /api/health/live` — Liveness probe: always returns `200 { status: "ok" }`
   - `GET /api/health/ready` — Readiness probe: checks DB, returns `200` or `503`

8. **Updated `.env.example`** with new config flags and documentation comments.

9. **Created 17 new integration tests** in `tests/integration/config-and-improvements.test.ts`:
   - Config flag defaults (5 tests)
   - Health live endpoint (2 tests)
   - Health ready endpoint (3 tests)
   - Scoped auth hooks (6 tests: GET without profile, POST/PUT/DELETE require profile, auth required)
   - Multipart limits (1 test)

### Files Changed

- `src/config/env.ts` — Modified (3 new config flags)
- `src/controllers/auth.controller.ts` — Modified (COOKIE_SECURE flag)
- `src/middleware/error.middleware.ts` — Modified (EXPOSE_ERROR_DETAILS flag)
- `src/services/auth.service.ts` — Modified (ENABLE_FIXED_VERIFICATION_CODE flag)
- `src/utils/phone.ts` — Modified (ENABLE_FIXED_VERIFICATION_CODE flag)
- `src/config/jwt.ts` — Modified (import.meta.dirname)
- `src/app.ts` — Modified (import.meta.dirname, multipart limits)
- `src/services/upload.service.ts` — Modified (import.meta.dirname)
- `src/server.ts` — Modified (pino-pretty + redaction)
- `src/routes/trip.routes.ts` — Modified (scoped auth hooks)
- `src/controllers/health.controller.ts` — Modified (live + ready handlers)
- `src/routes/health.routes.ts` — Modified (live + ready routes)
- `.env.example` — Modified (new config flags)
- `tests/integration/config-and-improvements.test.ts` — Created (17 tests)

### Verification Results

- **TypeScript**: PASS (0 errors across all 3 packages)
- **Tests**: PASS (821 total: 374 API, 83 shared, 364 web — 0 failures)
- **Lint**: PASS (0 errors)
- **Structural checks**: All 8 pass (no process.env.NODE_ENV in source except env.ts, no process.cwd() in source, config flags exist, health endpoints exist, scoped hooks exist, multipart limits exist, logger redaction exists, new test file exists)

### Reviewer Notes

- APPROVED with only LOW severity observations:
  - Logger redaction not applied in development mode (pino-pretty branch has no `redact`) — intentional trade-off for debug convenience
  - Multipart limits test only verifies app starts successfully, doesn't test actual limit enforcement — acceptable given the complexity of crafting multipart test payloads
  - `EXPOSE_ERROR_DETAILS` defaults to `false` in test environment (`NODE_ENV=test`), which matches production behavior but could make debugging test failures harder
  - `healthService.getStatus()` returns `status: "ok"` even with disconnected DB — the `ready` endpoint handles this correctly by checking `health.database` independently

### Learnings for Future Iterations

- **Config flag defaults use process.env.NODE_ENV intentionally**: The env.ts Zod schema is the single source of truth for NODE_ENV-based defaults. The rest of the app reads boolean config flags instead.
- **env singleton and fastify.config are the same object**: The config plugin does `fastify.decorate("config", env)`, so utility functions that import `env` directly (like `phone.ts`) can access the new flags without needing the Fastify instance.
- **import.meta.dirname paths are relative to the source file**: Unlike `process.cwd()` which gives the project root, `import.meta.dirname` gives the directory of the current file. Need `..` traversal to reach the project root (e.g., `src/config/` needs `../..`).
- **Fastify scoped plugins for shared hooks**: `fastify.register(async (scope) => { scope.addHook(...); })` creates an encapsulated context where hooks only apply to routes defined within. This eliminates the need to repeat `[authenticate, requireCompleteProfile]` on every write route.
- **Pino redaction in non-dev only**: pino-pretty in development doesn't support the same redaction paths format. Keeping redaction for production/test while allowing full debug output in development is a practical trade-off.
- **Health endpoint convention**: Liveness probes should be stateless (always 200 if process is up), while readiness probes check dependencies (DB). The liveness endpoint should never call the database to avoid false negatives during transient DB issues.
