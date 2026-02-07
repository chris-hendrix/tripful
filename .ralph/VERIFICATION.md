# Verification: API Audit & Fix

## Environment Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### Start Services

```bash
# Start PostgreSQL
pnpm docker:up

# Verify database is running
docker compose ps
```

### Environment Variables

Copy from example if not present:

```bash
cp apps/api/.env.example apps/api/.env  # if missing
```

Required variables in `apps/api/.env`:

```
DATABASE_URL=postgresql://tripful:tripful@localhost:5433/tripful
JWT_SECRET=<min 32 chars, auto-generated if missing>
FRONTEND_URL=http://localhost:3000
```

New variables added by this work (all have defaults):

```
COOKIE_SECURE=false          # Set true in production
EXPOSE_ERROR_DETAILS=true    # Set false in production
ENABLE_FIXED_VERIFICATION_CODE=true  # Set false in production
TRUST_PROXY=false            # Set true if behind load balancer
```

### Database Migration

```bash
cd apps/api
pnpm db:migrate
```

## Test Commands

### All Tests (primary verification)

```bash
pnpm test
```

### Unit Tests Only

```bash
cd apps/api && pnpm vitest run --reporter=verbose
```

### Integration Tests Only

```bash
cd apps/api && pnpm vitest run tests/integration/ --reporter=verbose
```

### E2E Tests

```bash
# Requires both web and api running
pnpm dev &   # Start both servers
pnpm test:e2e
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Formatting Check

```bash
pnpm format --check
```

## Ports and URLs

| Service        | URL                                    | Port                               |
| -------------- | -------------------------------------- | ---------------------------------- |
| API (dev)      | http://localhost:8000                  | 8000                               |
| Frontend (dev) | http://localhost:3000                  | 3000                               |
| PostgreSQL     | localhost:5433                         | 5433 (external) → 5432 (container) |
| Health check   | http://localhost:8000/api/health       | 8000                               |
| Health live    | http://localhost:8000/api/health/live  | 8000                               |
| Health ready   | http://localhost:8000/api/health/ready | 8000                               |

## Test Credentials

- **Phone number for testing**: Any valid format (e.g., `+1234567890`)
- **Fixed verification code** (non-production): `123456`
- **Database**: `tripful:tripful@localhost:5433/tripful`

## Verification Checklist

After each task, run:

1. `pnpm typecheck` — TypeScript compilation
2. `pnpm test` — All unit + integration tests
3. `pnpm lint` — ESLint checks

After final task, additionally run: 4. `pnpm test:e2e` — Playwright E2E tests 5. `pnpm format --check` — Prettier formatting

## Manual Verification

### API Smoke Test

```bash
# Start API
cd apps/api && pnpm dev

# Health check
curl http://localhost:8000/api/health

# Verify security headers (helmet)
curl -I http://localhost:8000/api/health

# Verify 404 handler
curl http://localhost:8000/api/nonexistent

# Verify schema validation (should return 400)
curl -X POST http://localhost:8000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "invalid"}'
```

## Feature Flags

No external feature flag service required. All feature toggles are environment variables with sensible defaults.

## Seed Data

No special seed data needed. Tests create their own test data. Database should be empty or in a clean state.
