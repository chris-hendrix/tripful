# Phase 5.5: User Profile & Auth Redirects - Verification

## Environment Setup

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- Docker (for PostgreSQL)

### Start services

```bash
# Start PostgreSQL
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Build shared package (needed for imports)
cd shared && pnpm build && cd ..
```

### Environment variables

- `apps/api/.env` — requires `DATABASE_URL` and `JWT_SECRET` (min 32 chars)
- `apps/web/.env.local` — requires `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

### Start dev servers

```bash
pnpm dev  # Starts both web (port 3000) and api (port 8000)
```

## Test Commands

### Type checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Unit + Integration tests

```bash
pnpm test
```

### E2E tests

```bash
pnpm test:e2e
```

### E2E tests with UI

```bash
pnpm test:e2e:ui  # Opens on port 9323
```

### Run specific test file

```bash
# API integration tests
cd apps/api && pnpm vitest run src/routes/user.routes.test.ts

# Web unit tests
cd apps/web && pnpm vitest run src/components/profile/profile-form.test.tsx

# Specific E2E test
cd apps/web && pnpm playwright test tests/e2e/auth-journey.spec.ts
```

## Ports and URLs

| Service            | URL                       |
| ------------------ | ------------------------- |
| Frontend (Next.js) | http://localhost:3000     |
| Backend (Fastify)  | http://localhost:8000     |
| API base           | http://localhost:8000/api |
| PostgreSQL         | localhost:5433            |
| Playwright UI      | http://localhost:9323     |

## Test Credentials

For E2E and manual testing, use the mock SMS service which logs verification codes to console:

- Any phone number in E.164 format (e.g., `+15551234567`)
- Verification code appears in API server console output
- In test environment, code is `123456`

## Database

### Drizzle Studio (visual browser)

```bash
cd apps/api && pnpm db:studio
```

### Generate migration after schema change

```bash
cd apps/api && pnpm db:generate
```

### Apply migrations

```bash
cd apps/api && pnpm db:migrate
```

## Key Verification Points

### After Task 1.1 (Schema changes)

- `pnpm typecheck` passes (may need to fix type errors in existing code from timezone becoming nullable)
- Migration generated and applied successfully
- `shared/` package builds

### After Task 2.1 (Backend API)

- `PUT /api/users/me` updates display name, timezone, handles
- `POST /api/users/me/photo` uploads profile photo
- `DELETE /api/users/me/photo` removes profile photo
- All three endpoints require auth (401 without cookie)
- Integration tests pass

### After Task 3.1 (Route rename)

- `/trips` shows the trip list (formerly `/dashboard`)
- `/dashboard` returns 404
- All links in UI point to `/trips`
- All unit and E2E tests pass with new paths

### After Task 4.1 (Auth redirects)

- Authenticated user visiting `/` redirects to `/trips`
- Authenticated user visiting `/login` redirects to `/trips`
- Unauthenticated user sees landing page at `/`
- Unauthenticated user sees login page at `/login`

### After Task 5.1 (Profile page)

- Profile page accessible from header dropdown
- Can edit display name and save
- Can upload, replace, and remove profile photo
- Timezone dropdown has "Auto-detect" option
- Venmo/Instagram handles can be added and show in members dialog
- Itinerary timezone toggle uses browser timezone when user timezone is null

### After Task 6.1 (Complete profile updates)

- Complete profile page has optional photo upload
- Timezone defaults to "Auto-detect"
- Redirect goes to `/trips` after completion
