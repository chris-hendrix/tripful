# Mobile UX Fixes - Verification

How to verify that all mobile UX fixes work correctly. Ralph executes ALL checks listed here.

---

## Environment Setup

### Prerequisites

```bash
# Start PostgreSQL
pnpm docker:up

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate && cd ../..
```

### Environment Variables

- `apps/api/.env` — needs `DATABASE_URL` and `JWT_SECRET`
- `apps/web/.env.local` — needs `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Start Development Servers

```bash
# Both servers
pnpm dev

# Or individually:
pnpm dev:api    # Backend on port 8000
pnpm dev:web    # Frontend on port 3000
```

---

## Automated Test Commands

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Unit + Integration Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

---

## Ports & URLs

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Fastify) | http://localhost:8000 |
| PostgreSQL | localhost:5433 |
| Playwright UI | http://localhost:9323 (when using `pnpm test:e2e:ui`) |

---

## Manual Testing Checklist

### Mobile Viewport (375x667)

Use Playwright to navigate and screenshot at mobile viewport size.

1. **Login page** — Verify phone input renders with country selector, meets 44px touch target
2. **Verify page** — Verify phone number is formatted (e.g., "+1 555 123 4567" not raw "+15551234567")
3. **Dashboard (empty)** — Verify FAB is visible, buttons meet touch targets
4. **Dashboard (with trips)** — Verify trip card cover placeholder has icon + vibrant gradient
5. **Create trip modal** — Verify backdrop dimming, scroll to Continue button works
6. **Trip detail** — Verify cover placeholder, "Going" badge visible, event count is dynamic
7. **Itinerary** — Verify action buttons are icon-only on mobile, tooltip on hover/focus
8. **Toast notification** — Verify toast appears bottom-right, doesn't overlap content

### Desktop Viewport (1280x720)

1. **Login page** — Phone input with full-width country selector
2. **Dashboard** — Trip cards with proper placeholders
3. **Trip detail** — Full layout with event count
4. **Itinerary** — Full text action buttons, proper spacing
5. **Toast** — Bottom-right positioning

### Touch Target Verification

Check that all interactive elements meet 44px minimum height on mobile:
- Buttons (all variants)
- Form inputs
- Itinerary toolbar buttons
- Checkbox form items

---

## Test Credentials

For E2E and manual testing, the app uses a mock auth flow in development. No real phone numbers needed — any number works with code `000000` in development mode.

---

## Screenshot Location

Save all manual test screenshots to `.ralph/screenshots/` with naming convention:
`iteration-{NNN}-{description}.png`

---

## Feature Flags

None required. All changes are straightforward UI updates with no feature flagging.

---

## New Dependencies

- `react-phone-number-input` — installed in `apps/web` via `pnpm --filter web add react-phone-number-input`
- `libphonenumber-js` — bundled with react-phone-number-input, no separate install needed
