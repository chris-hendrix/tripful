# Verification: Skill Audit Fixes

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
After schema changes (Phase 1):
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

### E2E Tests
```bash
pnpm test:e2e
```
Runs Playwright E2E tests. Requires both web (port 3000) and api (port 8000) servers running.

### Run Specific Tests
```bash
# Phase 1 - Auth service tests (JWT changes)
pnpm vitest run apps/api/src/services/__tests__/auth.service.test.ts

# Phase 3 - Form error utility
pnpm vitest run apps/web/src/lib/__tests__/form-errors.test.ts

# Phase 4 - Trip service (N+1 fix)
pnpm vitest run apps/api/src/services/__tests__/trip.service.test.ts

# Phase 4 - Notification service (count query)
pnpm vitest run apps/api/src/services/__tests__/notification.service.test.ts

# Phase 6 - E2E tests only
pnpm test:e2e
```

## Ports & URLs

| Service | Port | URL |
|---------|------|-----|
| Next.js (web) | 3000 | http://localhost:3000 |
| Fastify (api) | 8000 | http://localhost:8000 |
| PostgreSQL | 5433 (host) / 5432 (container) | postgres://localhost:5433/tripful |
| Playwright UI | 9323 | http://localhost:9323 |

## Feature Flags

None required. No new features — this is a quality/fix run.

## Phase-Specific Verification

### Phase 1: Quick Wins
- Verify: `X-Powered-By` header absent from API responses (`curl -I http://localhost:8000/api/trips`)
- Verify: JWT tokens no longer contain `phone` field (decode a token from login response)
- Verify: `Cache-Control: no-store` present on auth endpoint responses
- Verify: `<noscript>` block visible when JS disabled (browser DevTools → disable JS)
- Verify: Migration applied — `mutedBy` FK has `ON DELETE CASCADE`

### Phase 2: Component Library
- Verify: No `@radix-ui/react-*` imports remain in `components/ui/` (grep for `@radix-ui`)
- Verify: All focus rings use `focus-visible:` not `focus:` (grep for `focus:ring`)
- Verify: Components render correctly: open a dialog, use a select, check badge renders

### Phase 3: Forms
- Verify: Create event dialog submits timezone with the form data (check API request)
- Verify: Server errors on form dialogs appear on the relevant field, not just as toasts
- Verify: Notification badge animation re-triggers when count changes

### Phase 4: API Backend
- Verify: `getTripById` makes 1 query instead of 2 (check query logs or test response)
- Verify: 404 response for wrong HTTP method on an existing route (Fastify 5 returns 404 by design for method mismatches; the not-found handler includes method and URL in the error message)
- Verify: Rate limiting runs before auth in preHandler chain

### Phase 5: Accessibility
- Verify: Screen reader announces dynamic content changes (notification count, loading states)
- Verify: `--color-muted-foreground` passes WCAG AA (4.5:1 ratio) against all backgrounds
- Verify: Required fields have `aria-required="true"`
- Verify: Search query persists in URL

### Phase 6: E2E Tests
- Verify: No CSS selectors (`locator('input[...]')`, `locator('button:has-text()')`) remain in E2E files
- Verify: No `.first()` / `.last()` on generic locators
- Verify: No `page.evaluate()` for DOM manipulation
- Verify: Full E2E suite passes

### Phase 7: Mobile
- Verify: All interactive elements have ≥44px touch target at mobile viewport
- Verify: No `h-11 sm:h-9` inverse mobile-first patterns remain
- Verify: FAB has clearance from mobile browser navigation

### Phase 8: Design
- Verify: Plus Jakarta Sans renders as body font (check computed style)
- Verify: Page transitions animate on navigation
- Verify: List items stagger-reveal on load
- Verify: Buttons have press effect, cards have hover lift

## Pre-existing Test Failures

From previous Ralph runs, 19 unit tests may fail on main (unrelated to audit fixes). These pre-date the skill audit and are not regressions:

- **daily-itineraries worker** (10 failures) — itinerary scheduling/worker tests
- **app-header nav text** (5 failures) — navigation link text assertions
- **URL validation dialogs** (2 failures) — URL input validation in dialog components
- **auth lockout expiry timing** (1 failure) — timing-sensitive lockout window test
- **trip metadata** (1 failure) — trip detail metadata rendering

These should NOT be treated as regressions from this audit fix run. If they appear, note them in PROGRESS.md but do not attempt to fix them unless they're related to audit findings.
