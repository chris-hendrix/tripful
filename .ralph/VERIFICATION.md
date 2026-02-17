# Post-RSVP Onboarding Wizard - Verification

## Environment Setup

### Prerequisites
- Node.js 20+
- pnpm (workspace package manager)
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

# Start dev servers (both frontend + backend)
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

No new environment variables required for this feature.

---

## Test Commands

### Full Test Suite
```bash
# Run all tests (unit + integration)
pnpm test
```

### Frontend Unit Tests
```bash
# All frontend tests
cd apps/web && pnpm test

# Specific test files
cd apps/web && pnpm vitest run src/components/trip/__tests__/member-onboarding-wizard.test.tsx
cd apps/web && pnpm vitest run src/components/trip/__tests__/travel-reminder-banner.test.tsx
cd apps/web && pnpm vitest run src/components/trip/__tests__/trip-preview.test.tsx
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests (requires dev servers running)
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run specific test file
cd apps/web && npx playwright test tests/e2e/invitation-journey.spec.ts

# Run specific test by name
cd apps/web && npx playwright test -g "onboarding wizard"
```

### Linting & Type Checking
```bash
# TypeScript type checking
pnpm typecheck

# ESLint
pnpm lint

# Prettier formatting
pnpm format
```

---

## Feature Flags

No feature flags required. The onboarding wizard is always enabled.

---

## New Dependencies

None. Uses existing packages only:
- `react-hook-form` (already in apps/web)
- `@tanstack/react-query` (already in apps/web)
- `date-fns` (already in apps/web)
- shadcn/ui components: Sheet, Button, Input, DateTimePicker (all already available)

---

## Manual Testing Checklist

### Wizard Flow
- [ ] RSVP "Going" on trip preview shows success toast then wizard opens
- [ ] RSVP "Maybe" does NOT open wizard
- [ ] RSVP "Not Going" does NOT open wizard
- [ ] Progress dots show correct step (filled for current/completed, muted for future)
- [ ] Step 1 (Arrival): date pre-populates with trip start date, location placeholder visible
- [ ] Step 1: "Next" saves arrival and advances
- [ ] Step 1: "Skip" advances without saving
- [ ] Step 2 (Departure): date pre-populates with trip end date, location pre-fills from arrival
- [ ] Step 2: "Back" returns to step 1
- [ ] Step 2: "Next" saves departure and advances
- [ ] Step 3 (Events): only shown when member has permission (allowMembersToAddEvents or organizer)
- [ ] Step 3: Quick-add form creates events, shows chips for added events
- [ ] Step 3: X button on chip removes from display (does NOT delete from API)
- [ ] Done step: shows summary of saved items
- [ ] Done step: "View Itinerary" closes wizard
- [ ] Closing wizard via X or overlay click works at any step
- [ ] Previously saved steps are preserved when wizard is closed mid-flow

### Reminder Banner
- [ ] Banner appears when member has no arrival travel and wizard was dismissed/closed
- [ ] Banner does NOT appear if member already has arrival travel entry
- [ ] "Add Travel Details" button reopens the wizard
- [ ] "Dismiss" button hides banner and persists across page refreshes (localStorage)
- [ ] Banner does NOT appear for locked (past) trips

### Edge Cases
- [ ] Wizard works correctly when trip has no start/end dates (date fields empty, no pre-population)
- [ ] Events step hidden for non-organizer when allowMembersToAddEvents is false
- [ ] Loading spinner shows on Next button while mutation is in progress
