# Phase 6: Advanced Itinerary & Trip Management - Verification

## Environment Setup

### Prerequisites

- Node.js 20+ and pnpm installed
- Docker running (for PostgreSQL)

### Start Services

```bash
# Start PostgreSQL (port 5433 -> 5432 in container)
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..

# Start dev servers (frontend :3000, backend :8000)
pnpm dev
```

### Environment Variables

- `apps/api/.env` — requires `DATABASE_URL` and `JWT_SECRET` (min 32 chars)
- `apps/web/.env.local` — requires `NEXT_PUBLIC_API_URL=http://localhost:8000`

Copy from `.env.example` / `.env.local.example` if not present.

## Test Commands

### Unit & Integration Tests

```bash
# All tests (unit + integration)
pnpm test

# API tests only
cd apps/api && pnpm test

# Run specific test file
cd apps/api && pnpm test -- --run src/services/__tests__/permissions.service.test.ts
```

### E2E Tests (Playwright)

```bash
# Requires both dev servers running (pnpm dev)
pnpm test:e2e

# With UI mode (port 9323)
pnpm test:e2e:ui

# Run specific test file
cd apps/web && npx playwright test tests/phase-6.spec.ts
```

### Static Analysis

```bash
# Linting
pnpm lint

# Type checking
pnpm typecheck

# Formatting
pnpm format
```

## Ports & URLs

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Fastify API) | http://localhost:8000 |
| PostgreSQL | localhost:5433 |
| Drizzle Studio | `cd apps/api && pnpm db:studio` |
| Playwright UI | http://localhost:9323 |

## Test Credentials

Authentication uses mock SMS (verification codes logged to API console).

1. Navigate to http://localhost:3000/login
2. Enter any phone number (e.g., +12025551234)
3. Check API server console for the verification code
4. Enter the code to authenticate

For E2E tests, the Playwright test helpers handle auth automatically via `helpers/auth.ts`.

## Database Verification

After running migration for meetup fields:

```bash
cd apps/api && pnpm db:studio
```

Verify `events` table has new columns: `meetup_location` (text, nullable) and `meetup_time` (timestamp with timezone, nullable).

## Feature-Specific Verification

### Meetup Fields
- Create an event with meetup location and time filled in
- Verify values display on event card in expanded view
- Edit the event and change meetup fields, verify update persists

### Auto-Lock Past Trips
- Create a trip with end date in the past
- Verify FAB is hidden and read-only banner shows
- Verify API returns 403 for create/update/delete on events/accommodations/member-travel
- Verify restore still works on locked trips

### Remove Member
- As organizer, remove a member from members dialog
- Verify member disappears from member list
- Verify member's events remain with "member no longer attending" indicator

### Deleted Items
- As organizer, delete an event/accommodation/member-travel
- Scroll to bottom of itinerary, verify "Deleted Items" section appears
- Click to expand, verify deleted items listed with restore buttons
- Restore an item, verify it returns to the itinerary

### Multi-Day Event Badges
- Create an event spanning multiple days (e.g., start Feb 10, end Feb 12)
- Verify date range badge appears on the event card (e.g., "Feb 10–12")
- Event should only appear on start day in day-by-day view
