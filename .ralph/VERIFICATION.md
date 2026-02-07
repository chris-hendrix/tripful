# Verification: Frontend Best Practices

## Environment Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Docker (for PostgreSQL)
- Running PostgreSQL instance (`pnpm db:up` from root)

### Environment Variables

**Backend** (`apps/api/.env`):
- `DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5433/tripful`
- `JWT_SECRET=<min 32 char string>`
- `FRONTEND_URL=http://localhost:3000`

**Frontend** (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- `API_URL=http://localhost:8000/api` (new — server-side only, for RSC prefetching)

### Install Dependencies

```bash
pnpm install
```

### Start Services

```bash
# Terminal 1: PostgreSQL
pnpm db:up

# Terminal 2: API server (port 8000)
pnpm dev:api

# Terminal 3: Web server (port 3000)
pnpm dev:web
```

---

## Test Commands

### Unit & Integration Tests (Vitest)

```bash
# All tests (API + Web + Shared)
pnpm test

# Web tests only
pnpm --filter=@tripful/web test

# API tests only
pnpm --filter=@tripful/api test

# Watch mode (web)
pnpm --filter=@tripful/web test:watch
```

### E2E Tests (Playwright)

Requires both API and Web servers running.

```bash
# Run all E2E tests
pnpm test:e2e

# Run with browser UI
pnpm test:e2e:ui

# Run headed (visible browser)
pnpm --filter=@tripful/web test:e2e:headed
```

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm typecheck
```

### Production Build

```bash
pnpm build
```

### Format Check

```bash
pnpm format:check
```

---

## Ports & URLs

| Service     | URL                          | Notes                          |
|-------------|------------------------------|--------------------------------|
| Web (Next.js) | http://localhost:3000      | Frontend dev server            |
| API (Fastify) | http://localhost:8000      | Backend API                    |
| API Base     | http://localhost:8000/api   | API prefix                     |
| PostgreSQL   | localhost:5433              | External port → 5432 container |
| Playwright UI| http://localhost:9323       | When using `test:e2e:ui`       |

---

## Test Credentials

- **SMS verification code**: `123456` (hardcoded in test/dev environment)
- **Phone number format**: E.164 (e.g., `+15551234567`)
- Each E2E test uses unique phone numbers for isolation

---

## Key Verification Points Per Phase

### Phase 1: Foundation

- `pnpm typecheck` passes — shared types resolve from `@tripful/shared/types`
- `pnpm test` passes — no regressions from import path changes
- `pnpm lint` passes — no unused imports from deduplication

### Phase 2: Next.js Features

- `pnpm typecheck` passes — `next/image` and `next/font` imports are valid
- `pnpm test` passes — updated tests match new `Image` component markup
- Font loads correctly — check browser devtools for Playfair Display (no longer falls back to generic serif)
- Error boundaries render — navigate to invalid routes to verify `not-found.tsx` works
- Loading files render — route transitions show skeleton UI

### Phase 3: TanStack Query & React Performance

- `pnpm typecheck` passes
- `pnpm test` passes — all `isPending` assertions work, no `isLoading` references remain
- `pnpm lint` passes — TanStack Query ESLint plugin catches no errors
- React Query DevTools visible — floating panel appears in bottom-right during dev
- TripCard uses `<Link>` — verify prefetching on hover via browser network tab

### Phase 4: RSC Migration

- `pnpm typecheck` passes
- `pnpm test` passes — updated page/component tests work with new structure
- `pnpm test:e2e` passes — auth flow, dashboard, trip CRUD all functional
- `pnpm build` succeeds — critical for catching SSR/RSC serialization issues
- Auth guard works — unauthenticated users redirected to `/login` without client-side flash
- Server prefetching works — dashboard loads without showing loading skeleton on first visit (data pre-populated)
- Dynamic imports work — `CreateTripDialog`/`EditTripDialog` load on button click, preload on hover

### Phase 5: Final Verification

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build
```

All must pass with zero failures.

---

## Feature Flags

None required for this work. All changes are direct code improvements with no feature flag gating.

---

## Seed Data

No special seed data needed. E2E tests create their own test data via the API during test execution.
