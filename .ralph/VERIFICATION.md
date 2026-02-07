# Verification: Frontend Design Overhaul

## Environment Setup

### Prerequisites

- Node.js 20+
- pnpm (workspace package manager)
- Docker (for PostgreSQL)
- Playwright browsers installed

### Start Services

```bash
# From repo root: /home/chend/git/tripful

# Start PostgreSQL
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Start both dev servers
pnpm dev
```

### Ports & URLs

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Fastify API) | http://localhost:8000 |
| PostgreSQL | localhost:5433 (external) → 5432 (container) |
| Playwright UI | http://localhost:9323 (when using test:e2e:ui) |

### Environment Variables

- `apps/api/.env` — needs `DATABASE_URL` and `JWT_SECRET` (min 32 chars)
- `apps/web/.env.local` — needs `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

Copy from `.env.example` / `.env.local.example` if not present.

## Test Commands

### Unit & Integration Tests

```bash
# All tests (from repo root)
pnpm test

# Web tests only
cd apps/web && pnpm test

# API tests only
cd apps/api && pnpm test

# Watch mode (web)
cd apps/web && pnpm test:watch
```

### TypeScript & Linting

```bash
# TypeScript check (all packages)
pnpm typecheck

# Linting (all packages)
pnpm lint

# Format check
pnpm format
```

### E2E Tests (Playwright)

```bash
# Requires both dev servers running (pnpm dev)

# Run all E2E tests
cd apps/web && pnpm test:e2e

# Run with headed browser (visible)
cd apps/web && pnpm test:e2e:headed

# Run with Playwright UI
cd apps/web && pnpm test:e2e:ui
```

### Install Playwright Browsers (if needed)

```bash
cd apps/web && npx playwright install --with-deps chromium
```

## Verification Checklist

### After Every Task

1. `pnpm typecheck` — no TypeScript errors
2. `pnpm lint` — no linting errors
3. `pnpm test` — all unit/integration tests pass
4. Dev server runs without errors (`pnpm dev`)

### After Tasks with UI Changes

5. Manual browser check at http://localhost:3000
6. Responsive check at 375px, 768px, 1280px widths

### After Final Task (6.1)

7. `cd apps/web && pnpm test:e2e` — all E2E tests pass
8. Full manual walkthrough: landing → login → verify → dashboard → trip detail → create trip → edit trip → delete trip → logout
9. Keyboard-only navigation test (Tab through entire app, verify focus rings, skip link, dropdown menus)
10. Screenshots captured in `.ralph/screenshots/`

## Test Credentials

The app uses phone-based OTP authentication. For local testing:
- Use any valid phone number format (e.g., +15551234567)
- The verification code is logged to the API server console in development mode
- Check the API terminal output for the OTP code after requesting verification

## Feature Flags

None required. All changes are direct UI modifications with no feature flag gating.

## Seed Data

No special seed data required. The app works with an empty database (shows empty states). Create test trips through the UI after logging in to verify trip card grid, trip detail, etc.

## Environment Validation (2026-02-07)

| Check | Status | Details |
|-------|--------|---------|
| Dependencies (`node_modules`) | PASS | Installed |
| API env (`apps/api/.env`) | PASS | Present |
| Web env (`apps/web/.env.local`) | PASS | Present |
| PostgreSQL (Docker) | PASS | Container `tripful-postgres` healthy |
| Playwright npm package | PASS | `@playwright/test` v1.58.1 |
| Playwright browsers | PASS | Chromium v1208 installed |
| `pnpm typecheck` | PASS | No errors |
| `pnpm lint` | PASS | No errors |
| `pnpm test` | PASS | 385 tests, 16 files |
| Next.js dev server (`:3000`) | PASS | HTTP 200 |
| Fastify API server (`:8000`) | PASS | HTTP 200 |

All verification commands confirmed runnable. Environment ready for execution.

## Notes

- The pre-commit hook runs GitGuardian (requires Docker). If Docker is not running, the hook will fail. Start Docker or use `--no-verify` only if needed for testing.
- Tailwind CSS v4 uses CSS-first config via `@theme` in globals.css — there is no tailwind.config.js file.
- shadcn/ui components are installed via `pnpm dlx shadcn@latest add <component>` from the `apps/web` directory.
