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

