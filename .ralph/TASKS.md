# Tasks: API Audit & Fix

## Phase 1: Foundation — Plugin Architecture & App Builder

- [ ] Task 1.1: Refactor to Fastify plugin architecture with buildApp extraction and graceful shutdown
  - Implement: Install dependencies (`@fastify/type-provider-zod`, `@fastify/helmet`, `@fastify/error`, `@fastify/under-pressure`, `close-with-grace`, `pino-pretty`)
  - Implement: Create `src/plugins/config.ts` — wrap env config as Fastify plugin, decorate `fastify.config`
  - Implement: Create `src/plugins/database.ts` — wrap database as Fastify plugin, pass `schema` to `drizzle()`, decorate `fastify.db`, add `onClose` hook for pool cleanup
  - Implement: Create `src/plugins/auth-service.ts` — wrap AuthService as plugin, decorate `fastify.authService`, eliminate the `new AuthService(request.server)` constructor pattern by accessing `fastify.jwt` directly through decoration
  - Implement: Create `src/plugins/trip-service.ts`, `src/plugins/permissions-service.ts`, `src/plugins/upload-service.ts`, `src/plugins/sms-service.ts`, `src/plugins/health-service.ts` — all services as plugins with dependency declarations
  - Implement: Update `src/types/index.ts` — add FastifyInstance type augmentation for all decorated properties (`db`, `config`, `authService`, `tripService`, `permissionsService`, `uploadService`, `smsService`, `healthService`)
  - Implement: Create `src/app.ts` — extract `buildApp()` function that registers all plugins, sets up validator/serializer compilers for Zod type provider, registers error handler, not-found handler, and routes
  - Implement: Refactor `src/server.ts` — call `buildApp()`, use `close-with-grace` for shutdown instead of manual signal handlers
  - Implement: Update `tests/helpers.ts` — import `buildApp()` from `src/app.ts` instead of duplicating setup
  - Implement: Update all controllers to access services via `request.server.tripService`, `request.server.authService`, etc. instead of direct singleton imports
  - Implement: Replace all `console.log`/`console.error` with `fastify.log` (database.ts, jwt.ts, sms.service.ts). Keep `console.error` only in env.ts (runs before Fastify)
  - Test: Update all existing unit and integration tests to use the new `buildApp()` from `src/app.ts`
  - Test: Verify plugin dependency ordering works (db before services, config before all)
  - Test: Verify graceful shutdown closes database pool
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm test` — all existing tests pass
  - Verify: `pnpm lint` passes

## Phase 2: Drizzle ORM Improvements — Schema, Relations, Transactions, Queries

- [ ] Task 2.1: Add Drizzle relations, unique constraint, transactions, count aggregate, pagination, and column selection
  - Implement: Create `src/db/schema/relations.ts` — define `relations()` for users, trips, members (usersRelations, tripsRelations, membersRelations)
  - Implement: Export relations from `src/db/schema/index.ts`
  - Implement: Add unique constraint on members table: `unique("members_trip_user_unique").on(table.tripId, table.userId)`
  - Implement: Generate migration with `pnpm db:generate` and review generated SQL
  - Implement: Wrap `createTrip()` in `db.transaction()` — trip insert + creator member + co-organizer members
  - Implement: Wrap `addCoOrganizers()` in `db.transaction()` — member count check + inserts (prevent race condition)
  - Implement: Wrap `cancelTrip()` in `db.transaction()` for consistency
  - Implement: Fix `getMemberCount()` — use `select({ value: count() })` instead of fetching all rows
  - Implement: Fix `getUserTrips()` N+1 — refactor to use Drizzle relational API (`db.query.trips.findMany` with `with` clauses) or batch queries
  - Implement: Add offset-based pagination to `getUserTrips()` — accept `page` and `limit` params, return `{ data: TripSummary[], meta: { total, page, limit, totalPages } }`
  - Implement: Add explicit column selection in auth middleware user lookup (hot path) — only select `id`, `displayName`
  - Test: Write integration test for transaction rollback (e.g., createTrip with invalid data at step 2 should not create orphaned trip)
  - Test: Write integration test for unique constraint (duplicate member insert returns 409)
  - Test: Write integration test for pagination (page/limit params, meta object in response)
  - Test: Verify count aggregate returns correct number
  - Test: Update existing trip tests for new response shape (paginated getUserTrips)
  - Verify: Run migration on test database
  - Verify: `pnpm test` — all tests pass
  - Verify: `pnpm typecheck` passes

## Phase 3: Route Schemas, Typed Errors & Security

- [ ] Task 3.1: Add Zod route schemas, @fastify/error typed errors, helmet, rate limiting, and security hardening
  - Implement: Create `src/errors.ts` — define typed error classes with `@fastify/error` `createError()` (UnauthorizedError, TripNotFoundError, PermissionDeniedError, MemberLimitExceededError, CoOrganizerNotFoundError, CannotRemoveCreatorError, DuplicateMemberError, FileTooLargeError, InvalidFileTypeError, ProfileIncompleteError)
  - Implement: Update services to throw typed errors instead of generic `new Error("Permission denied: ...")` strings
  - Implement: Update `src/middleware/error.middleware.ts` — handle `@fastify/error` instances by reading `.statusCode` and `.code`, remove string-based matching
  - Implement: Update all controllers — remove manual `error.message.startsWith(...)` matching in catch blocks, let typed errors propagate to error handler or handle with `instanceof`
  - Implement: Define Zod response schemas for all endpoints (success and error responses)
  - Implement: Add `schema` option to every route in `auth.routes.ts`, `trip.routes.ts`, `health.routes.ts` — params, body, querystring, and response schemas
  - Implement: Remove manual Zod `safeParse()` from controllers (Fastify handles validation via schema)
  - Implement: Remove `as` type casts on `request.params` and `request.body` (Fastify infers types from schema)
  - Implement: Register `@fastify/helmet` in `buildApp()` with `contentSecurityPolicy: false` (API-only)
  - Implement: Add rate limiting to `POST /api/auth/verify-code` — 10 attempts per 15 minutes per phone number
  - Implement: Register `@fastify/under-pressure` for load shedding
  - Implement: Add `setNotFoundHandler` for consistent 404 responses on unknown routes
  - Implement: Add `TRUST_PROXY` env variable, configure `trustProxy` on Fastify instance
  - Test: Write integration tests verifying 400 responses for invalid params (bad UUID format, missing body fields)
  - Test: Write integration test for rate limiting on verify-code endpoint
  - Test: Write integration test verifying security headers are present (helmet)
  - Test: Write integration test for 404 on unknown routes
  - Test: Update all existing controller/integration tests for new error response format (typed error codes)
  - Test: Verify response serialization strips undeclared properties
  - Verify: `pnpm test` — all tests pass
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm lint` passes

## Phase 4: Configuration, Logging & Remaining Improvements

- [ ] Task 4.1: Add explicit config flags, logger improvements, scoped hooks, multipart limits, and health checks
  - Implement: Add env variables to config schema: `COOKIE_SECURE`, `EXPOSE_ERROR_DETAILS`, `ENABLE_FIXED_VERIFICATION_CODE`, `TRUST_PROXY`
  - Implement: Replace all `process.env.NODE_ENV` checks in services/controllers/middleware with explicit config flags from `fastify.config`
  - Implement: Replace `process.cwd()` with `import.meta.dirname` in `config/jwt.ts` and static file serving
  - Implement: Configure logger redaction for sensitive fields: `req.headers.authorization`, `req.headers.cookie`, `req.body.phoneNumber`
  - Implement: Add `pino-pretty` transport for development mode logger
  - Implement: Refactor `trip.routes.ts` to use scoped auth hooks — register `authenticate` + `requireCompleteProfile` as scoped hooks via plugin encapsulation for write routes, keep GET routes outside scope
  - Implement: Configure additional multipart limits: `throwFileSizeLimit: true`, `fieldNameSize: 100`, `fields: 10`, `headerPairs: 2000`
  - Implement: Add liveness/readiness health check endpoints: `GET /api/health/live` (always 200) and `GET /api/health/ready` (checks DB)
  - Implement: Update `.env.example` with new environment variables and documentation
  - Test: Write unit test for config flag defaults (COOKIE_SECURE defaults based on NODE_ENV, etc.)
  - Test: Write integration tests for `/api/health/live` and `/api/health/ready` endpoints
  - Test: Verify logger redaction works (sensitive fields not in log output)
  - Test: Verify scoped hooks apply correctly (write routes require auth, GET routes work without profile)
  - Test: Update any tests affected by config flag changes
  - Verify: `pnpm test` — all tests pass
  - Verify: `pnpm typecheck` passes
  - Verify: `pnpm lint` passes

## Phase 5: Final Verification

- [ ] Task 5.1: Full regression check and E2E validation
  - Verify: all unit tests pass (`pnpm test`)
  - Verify: all E2E tests pass (`pnpm test:e2e`)
  - Verify: linting passes (`pnpm lint`)
  - Verify: type checking passes (`pnpm typecheck`)
  - Verify: formatting passes (`pnpm format --check`)
  - Verify: API starts cleanly with `pnpm dev:api` and health endpoint responds
  - Verify: no console.log/console.error remaining (except env.ts pre-Fastify)
  - Verify: no `process.env.NODE_ENV` checks remaining in services/controllers/middleware
  - Verify: no `as` type casts on request.params/request.body in controllers
  - Verify: no `error.message.startsWith(...)` patterns in controllers
