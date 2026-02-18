# Rebase and Fix All Dependabot PRs - Verification

## Environment Setup

### Prerequisites
- Node.js >=22.0.0
- pnpm 10.28.2 (workspace package manager)
- Docker (for PostgreSQL)
- Playwright browsers (for E2E tests)

### Start Services

```bash
# Start PostgreSQL (Docker)
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Start dev servers (both frontend + backend) — needed for E2E
pnpm dev
```

### Ports & URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend (Next.js) | http://localhost:3000 | 3000 |
| Backend API (Fastify) | http://localhost:8000 | 8000 |
| PostgreSQL | localhost:5433 (external) | 5433→5432 |
| Playwright UI | http://localhost:9323 | 9323 |

### Environment Variables

Already configured:
- `apps/api/.env` — DATABASE_URL, JWT_SECRET, etc.
- `apps/web/.env.local` — NEXT_PUBLIC_API_URL

No new environment variables required.

---

## Test Commands

### Full Verification Suite (run after each task)

```bash
# Linting
pnpm lint

# Type checking
pnpm typecheck

# Unit + integration tests
pnpm test

# E2E tests (requires dev servers running)
pnpm test:e2e
```

### Per-Package Tests

```bash
# API tests only
cd apps/api && pnpm test

# Web tests only
cd apps/web && pnpm test

# Shared tests only
cd shared && pnpm test
```

### Drizzle Verification

```bash
# Verify migration tooling still works (dry run)
cd apps/api && pnpm db:generate
# Should report "No schema changes detected" if schema is compatible
```

### E2E with UI

```bash
# For debugging E2E failures
pnpm test:e2e:ui
```

---

## Feature Flags

None. This is a dependency upgrade — no feature flags involved.

---

## Pre-existing Test Failures (Resolved)

8 test failures pre-dated the dependency upgrade work. All have been fixed in Phase 5:

1. `apps/web/src/components/__tests__/app-header.test.tsx` — 5 failures → FIXED (Task 5.1: deleted obsolete tests)
2. `apps/web/src/components/itinerary/__tests__/create-accommodation-dialog.test.tsx` — 1 failure → FIXED (Task 5.2: corrected test input)
3. `apps/web/src/components/itinerary/__tests__/create-event-dialog.test.tsx` — 1 failure → FIXED (Task 5.2: corrected test input)
4. `apps/web/src/app/(app)/trips/[id]/page.test.tsx` — 1 failure → FIXED (Task 5.3: updated assertion + added mock)

**Status**: All pre-existing failures resolved. 0 known failures remain.

---

## Key Verification Points Per Task

### Task 1.1 (Version Bumps)
- `pnpm install` completes without errors
- Lockfile regenerated successfully

### Task 2.1 (Shared Schemas)
- `pnpm typecheck` passes for `shared/` package
- `z.infer` types resolve correctly

### Task 2.2 (API Layer)
- `pnpm typecheck` passes for `apps/api/`
- `pnpm test` in `apps/api/` — all tests pass
- No 400 vs 401/403/404 mismatches in route tests

### Task 2.3 (Frontend)
- `pnpm typecheck` passes for `apps/web/`
- `pnpm test` in `apps/web/` — all tests pass (0 failures)

### Task 3.1 (ESLint & Dev Deps)
- `pnpm lint` passes (0 errors)
- `cd apps/api && pnpm db:generate` doesn't error

### Task 4.1 (Full Regression)
- All 4 commands pass: lint, typecheck, test, test:e2e
- Dependabot PRs #20, #22, #23 closed

### Task 5.1 (App Header Tests)
- `cd apps/web && pnpm vitest run src/components/__tests__/app-header.test.tsx` — all tests pass (8 remaining)
- No test file references "My Trips" or `role="navigation"`

### Task 5.2 (URL Validation Tests)
- `cd apps/web && pnpm vitest run src/components/itinerary/__tests__/create-accommodation-dialog.test.tsx` — all pass
- `cd apps/web && pnpm vitest run src/components/itinerary/__tests__/create-event-dialog.test.tsx` — all pass

### Task 5.3 (Metadata Test)
- `cd apps/web && pnpm vitest run src/app/\(app\)/trips/\[id\]/page.test.tsx` — all pass
- Both success case (returns trip name) and error case (returns fallback "Trip") covered

### Task 6.1 (API Retry)
- `retry: 2` present in `apps/api/vitest.config.ts`
- `cd apps/api && pnpm test` passes without manual retries

### Task 6.2 (E2E Toast Stability)
- `pnpm test:e2e` — 32/32 pass
- Run twice to confirm no flakiness

### Task 7.1 (Final Verification)
- `pnpm lint` — 0 errors
- `pnpm typecheck` — 0 errors
- `pnpm test` — 0 failures across all packages
- `pnpm test:e2e` — 32/32 pass
