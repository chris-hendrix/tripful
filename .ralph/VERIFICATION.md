# Messaging & Notifications - Verification

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

Files already configured:
- `apps/api/.env` - DATABASE_URL, JWT_SECRET, etc.
- `apps/web/.env.local` - NEXT_PUBLIC_API_URL

No new environment variables required for this feature. SMS uses MockSMSProvider in dev (logs to console).

---

## Test Commands

### Full Test Suite
```bash
# Run all tests (unit + integration)
pnpm test

# Run tests in watch mode
pnpm test -- --watch
```

### Backend Unit Tests
```bash
# All backend unit tests
cd apps/api && pnpm test -- tests/unit/

# Specific service tests
cd apps/api && pnpm test -- tests/unit/message.service.test.ts
cd apps/api && pnpm test -- tests/unit/notification.service.test.ts
cd apps/api && pnpm test -- tests/unit/sms.service.test.ts
cd apps/api && pnpm test -- tests/unit/scheduler.service.test.ts
cd apps/api && pnpm test -- tests/unit/permissions.service.test.ts
```

### Backend Integration Tests
```bash
# All backend integration tests (requires PostgreSQL running)
cd apps/api && pnpm test -- tests/integration/

# Specific route tests
cd apps/api && pnpm test -- tests/integration/message.routes.test.ts
cd apps/api && pnpm test -- tests/integration/notification.routes.test.ts
```

### Frontend Tests
```bash
# All frontend tests
cd apps/web && pnpm test
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests (requires dev servers running)
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run specific test file
cd apps/web && npx playwright test tests/e2e/messaging.spec.ts
cd apps/web && npx playwright test tests/e2e/notifications.spec.ts

# Run specific test by name
cd apps/web && npx playwright test -g "post a message"
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

## Database

### Generate Migration (after schema changes)
```bash
cd apps/api && pnpm db:generate
```

### Apply Migration
```bash
cd apps/api && pnpm db:migrate
```

### Visual Database Browser
```bash
cd apps/api && pnpm db:studio
```

### New Tables (expected after Task 1.1)
- `messages`
- `message_reactions`
- `notifications`
- `notification_preferences`
- `muted_members`
- `sent_reminders`

---

## Test Credentials

Use existing E2E test helpers in `apps/web/tests/e2e/helpers/auth.ts` for test user creation and authentication.

The test setup creates users via the auth flow (phone verification). Test users:
- User A: Trip organizer (creates trip)
- User B: Going member (for messaging, receiving notifications)
- User C: Going member (second member for testing cross-user flows)

---

## Feature Flags

No feature flags required. The messaging and notification features are always enabled once deployed.

---

## Manual Testing Checklist

### Messaging
- [ ] Post a message as going member, see it in feed instantly
- [ ] Reply to a message, see thread expand
- [ ] Click each of the 6 reaction emojis, verify toggle on/off
- [ ] Edit own message, see "edited" indicator
- [ ] Delete own message, see "This message was deleted" placeholder
- [ ] As organizer: delete another member's message
- [ ] As organizer: pin a message, see it in pinned section
- [ ] As organizer: unpin a message
- [ ] As organizer: mute a member from Members dialog
- [ ] As muted member: see disabled input with muted notice
- [ ] As organizer: unmute a member
- [ ] View past trip: discussion is read-only (disabled input)
- [ ] "X messages" indicator in trip meta scrolls to discussion
- [ ] Load more messages (pagination)
- [ ] Non-going member does NOT see discussion section

### Notifications
- [ ] Global bell shows unread count
- [ ] Click bell, see notification dropdown with recent items
- [ ] Click a notification, navigate to trip discussion
- [ ] "Mark all as read" clears unread count
- [ ] Per-trip bell shows trip-scoped unread count
- [ ] Per-trip dialog: Notifications tab lists trip notifications
- [ ] Per-trip dialog: Preferences tab shows 3 toggles
- [ ] Toggle off "Trip messages", verify no new message notifications
- [ ] Toggle on "Trip messages", verify notifications resume

### Scheduler (verify via API logs)
- [ ] Event reminder: check server logs for SMS mock output ~1 hour before event
- [ ] Daily itinerary: check server logs for SMS mock output at ~8am trip timezone

---

## New Dependencies

### Backend (apps/api)
- `date-fns-tz` - Timezone handling for scheduler (install with `pnpm add date-fns-tz`)

### Frontend (apps/web)
- No new dependencies (uses existing date-fns, shadcn/ui, TanStack Query)
