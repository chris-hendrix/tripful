# Verification: Member Privacy & List UX

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

### Database Migration
After schema changes:
```bash
cd apps/api && pnpm db:generate    # Generate migration from schema
cd apps/api && pnpm db:migrate     # Apply migration
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

To run specific test files:
```bash
# Member list component tests
pnpm vitest run apps/web/src/components/trip/__tests__/members-list.test.tsx

# Onboarding wizard tests
pnpm vitest run apps/web/src/components/trip/__tests__/member-onboarding-wizard.test.tsx

# Notification preferences tests
pnpm vitest run apps/web/src/components/notifications/__tests__/notification-preferences.test.tsx

# Edit trip dialog tests
pnpm vitest run apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx

# Invitation hooks tests
pnpm vitest run apps/web/src/hooks/__tests__/use-invitations.test.tsx
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

None required. New columns have sensible defaults:
- `members.share_phone` defaults to `false` (privacy-first)
- `trips.show_all_members` defaults to `false` (privacy-first)

No third-party services needed. No feature flags to enable.

## Key Verification Points

1. **Migration applied**: After schema changes, `pnpm db:generate` creates a new migration SQL file in `apps/api/src/db/migrations/`. `pnpm db:migrate` applies it. Verify `share_phone` column exists on members table and `show_all_members` column exists on trips table.
2. **Phone privacy**: GET /trips/:tripId/members returns `phoneNumber` only when requesting user is organizer OR member has `sharePhone=true`. Non-organizers never see phones of members who haven't opted in.
3. **Member visibility**: When `showAllMembers=false` (default), non-organizer members only see `going` + `maybe` members. Organizers always see all.
4. **Organizer phone leak fixed**: GET /trips/:id no longer returns organizer phone numbers to non-organizer members.
5. **RSVP extension**: POST /trips/:tripId/rsvp accepts optional `sharePhone` boolean alongside `status`.
6. **My-settings endpoints**: GET and PATCH /trips/:tripId/my-settings work for any trip member.
7. **UI changes**: Venmo shows as icon (not text), member list rows have consistent padding, phone display respects API filtering.

## Pre-existing Test Failures

From the previous Ralph run, 8 web unit tests are known to fail on main (unrelated to this feature):
- app-header nav text (5 tests)
- trip metadata (1 test)
- URL validation dialogs (2 tests)

These should NOT be treated as regressions from this feature.
