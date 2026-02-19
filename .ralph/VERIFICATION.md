# Verification: Notification Task Queue

## Environment Setup

### Prerequisites
- Node.js 20+
- pnpm (workspace package manager)
- Docker (for PostgreSQL)

### Start Services
```bash
pnpm docker:up        # Start PostgreSQL (port 5433 -> 5432)
```

### Environment Variables
Copy from example files (already configured for dev):
- `apps/api/.env` — requires `DATABASE_URL` and `JWT_SECRET`
- `apps/web/.env.local` — requires `NEXT_PUBLIC_API_URL`

### Install Dependencies
```bash
pnpm install
```

## Test Commands

### TypeScript Compilation
```bash
pnpm typecheck
```
Runs `tsc --noEmit` across all 3 packages (api, web, shared). Must show 0 errors.

### Linting
```bash
pnpm lint
```
Runs ESLint across all packages. Must show 0 errors.

### Unit & Integration Tests
```bash
pnpm test
```
Runs Vitest across all packages. Requires PostgreSQL running.

To run only worker tests:
```bash
cd apps/api && pnpm vitest run tests/unit/workers/
```

To run a specific test file:
```bash
cd apps/api && pnpm vitest run tests/unit/workers/notification-batch.worker.test.ts
```

### E2E Tests
```bash
pnpm test:e2e
```
Runs Playwright E2E tests. Requires both web (port 3000) and api (port 8000) servers running.

## Ports & URLs

| Service | Port | URL |
|---------|------|-----|
| Next.js (web) | 3000 | http://localhost:3000 |
| Fastify (api) | 8000 | http://localhost:8000 |
| PostgreSQL | 5433 (host) / 5432 (container) | postgres://localhost:5433/tripful |
| Playwright UI | 9323 | http://localhost:9323 |

## Feature Flags

None required. pg-boss auto-creates its `pgboss` schema on first `boss.start()`.

Worker registration is guarded by `NODE_ENV !== "test"` — workers only run in development/production.

## Key Verification Points

1. **pg-boss schema created**: After starting the API with queue plugin, verify `pgboss` schema exists in PostgreSQL
2. **No new DB migrations needed**: pg-boss manages its own schema; no Drizzle migrations required
3. **Test isolation**: Queue workers do NOT run during tests (NODE_ENV=test guard). Services fall back to direct execution.
4. **Fallback paths**: NotificationService and InvitationService must work with `boss = null` (test path) and `boss = PgBoss` (production path)
5. **Scheduler fully removed**: No references to SchedulerService, scheduler-service plugin, or setInterval patterns remain after Phase 4
