# Phase 7: Polish & Testing - Verification

## Environment Setup

### Prerequisites
- Node.js 20+
- pnpm (workspace package manager)
- Docker (for PostgreSQL)
- Playwright browsers (for E2E tests)

### Start Services

```bash
# Start PostgreSQL (port 5433 -> container 5432)
pnpm docker:up

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Start dev servers (web:3000, api:8000)
pnpm dev
```

### Environment Files

- `apps/api/.env` - Backend environment (DATABASE_URL, JWT_SECRET)
- `apps/web/.env.local` - Frontend environment (NEXT_PUBLIC_API_URL=http://localhost:8000)

## Test Commands

### Linting
```bash
pnpm lint
```

### Type Checking
```bash
pnpm typecheck
```

### Unit + Integration Tests
```bash
# All tests
pnpm test

# With coverage
pnpm test -- --coverage

# Specific test file
pnpm test -- apps/api/tests/unit/invitation.service.test.ts
pnpm test -- apps/api/tests/integration/trip.routes.test.ts
```

### E2E Tests
```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with Playwright UI (port 9323)
pnpm test:e2e:ui

# Run specific E2E test file
pnpm test:e2e -- apps/web/tests/e2e/trip-journey.spec.ts
```

### Install Playwright Browsers (if needed)
```bash
npx playwright install --with-deps chromium
```

## Ports and URLs

| Service | URL | Port |
|---------|-----|------|
| Next.js Frontend | http://localhost:3000 | 3000 |
| Fastify API | http://localhost:8000 | 8000 |
| PostgreSQL | localhost:5433 | 5433 (ext) -> 5432 (container) |
| Drizzle Studio | via `cd apps/api && pnpm db:studio` | 4983 |
| Playwright UI | http://localhost:9323 | 9323 |

## Test Credentials

Authentication uses phone-number SMS codes. In development, codes are logged to the API console (mock SMS service).

Test flow:
1. Enter phone number on `/login` (e.g., +15551234567)
2. Check API console output for the verification code
3. Enter code on `/verify`
4. Complete profile if first login

## Database

```bash
# Generate migration from schema changes
cd apps/api && pnpm db:generate

# Apply pending migrations
cd apps/api && pnpm db:migrate

# Open visual database browser
cd apps/api && pnpm db:studio
```

## Feature Flags

No feature flags are used. All features are enabled by default.

## Verification Checklist

After each task, run these checks:

1. **Type check**: `pnpm typecheck` - must pass with no errors
2. **Lint**: `pnpm lint` - must pass with no errors
3. **Unit + Integration tests**: `pnpm test` - all tests must pass
4. **E2E tests**: `pnpm test:e2e` - all tests must pass (when E2E changes made)
5. **Dev server**: `pnpm dev` - must start without errors

## Manual Testing

For responsive design (Task 4.1) and performance (Task 5.2), use Playwright for browser automation:
- Navigate to each page
- Resize viewport to test breakpoints (375px, 768px, 1024px)
- Screenshot key states
- Save screenshots to `.ralph/screenshots/`

For API testing, use curl or the Fastify test utilities in integration tests.
