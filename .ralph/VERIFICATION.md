# Phase 5: Invitations & RSVP - Verification

## Environment Setup

### Prerequisites
- Node.js 20+
- pnpm (required - never use npm or yarn)
- Docker (for PostgreSQL)

### Start Services

```bash
# Start PostgreSQL
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Start dev servers (both web + api)
pnpm dev
```

### Ports & URLs

| Service      | URL                            |
|-------------|--------------------------------|
| Frontend     | http://localhost:3000           |
| Backend API  | http://localhost:8000           |
| Health check | http://localhost:8000/api/health|
| PostgreSQL   | localhost:5433 (external)      |
| Drizzle Studio | `cd apps/api && pnpm db:studio` |
| Playwright UI | http://localhost:9323 (when using `pnpm test:e2e:ui`) |

### Environment Variables

- `apps/api/.env` - Must have `DATABASE_URL` and `JWT_SECRET` (min 32 chars)
- `apps/web/.env.local` - Must have `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Test Commands

### Unit & Integration Tests (Vitest)

```bash
# All tests
pnpm test

# Watch mode
pnpm test -- --watch

# API tests only
cd apps/api && pnpm test

# Shared package tests only
cd shared && pnpm test

# Specific test file
cd apps/api && pnpm test -- src/services/invitation.service.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests (starts servers if not running)
pnpm test:e2e

# Run with UI mode (interactive debugging)
pnpm test:e2e:ui

# Run specific test file
cd apps/web && npx playwright test tests/e2e/invitation-journey.spec.ts

# Run with headed browser (visible)
cd apps/web && npx playwright test --headed

# View last test report
cd apps/web && npx playwright show-report
```

**Important**: E2E tests require both web (port 3000) and API (port 8000) servers running. Playwright config auto-starts them if not already running.

### Code Quality

```bash
# TypeScript type checking
pnpm typecheck

# ESLint
pnpm lint

# Prettier formatting
pnpm format
```

## Test Credentials

No real credentials needed - the app uses mock SMS service that logs verification codes to console. E2E tests use `authenticateViaAPI` helper that bypasses UI auth flow.

## Database

```bash
# Generate migration from schema changes
cd apps/api && pnpm db:generate

# Apply pending migrations
cd apps/api && pnpm db:migrate

# Visual database browser
cd apps/api && pnpm db:studio
```

## Feature Flags

None required. Phase 5 features are always enabled.

## Verification Checklist

For each task, run:

1. `pnpm typecheck` - TypeScript compilation
2. `pnpm lint` - Linting
3. `pnpm test` - Unit + integration tests
4. `pnpm test:e2e` - E2E tests (for UI tasks)

All four must pass before a task is considered complete.
