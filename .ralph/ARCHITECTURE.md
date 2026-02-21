# E2E Test Simplification — Architecture

## Overview

Reduce the E2E test suite from 32 tests / 9 files to 22 tests / 7 files by removing tests covered by unit tests, merging related tests, optimizing test infrastructure, and splitting CI into smoke/regression tiers.

## Testing Strategy

- **Verification**: Run full E2E suite (`pnpm test:e2e`) after each phase to catch regressions
- **No new tests written**: This is a deletion/refactoring task — existing tests are kept, merged, or removed
- **Final check**: Full E2E + lint + typecheck + unit tests

---

## E2E Test Files

All specs live in `apps/web/tests/e2e/`. Helpers in `apps/web/tests/e2e/helpers/`.

### Files to DELETE (entire file)

**`app-shell.spec.ts`** (1 test)
- Coverage: `app-header.test.tsx` (13 tests), `skip-link.test.tsx` (5 tests)

**`invitation-helpers.spec.ts`** (2 tests)
- Tests internal API helper functions, not user flows
- Keep `helpers/invitations.ts` intact — used by other specs

### Tests to DELETE (individual tests from files)

**From `trip-journey.spec.ts`:**
- `"trip form validation"` — covered by `trip-schemas.test.ts` (46+ tests) and `create-trip-dialog.test.tsx` (60+ tests)

**From `itinerary-journey.spec.ts`:**
- `"itinerary permissions and validation"` — covered by `event-schemas.test.ts` (50+ tests) and event dialog tests (65+ tests)
- `"meetup location and time on event card"` — covered by `event-card.test.tsx` meetup group (3 tests)
- `"multi-day event badge"` — covered by `event-card.test.tsx` multi-day group (4 tests)

**From `messaging.spec.ts`:**
- `"restricted states journey"` — muted=edge case, past-trip messaging duplicates `auto-lock past trips` test

**From `notifications.spec.ts`:**
- `"notification preferences journey"` — covered by `notification-preferences.test.tsx` (25+ tests)

### Tests to MERGE

**Auth merge** — `auth-journey.spec.ts`:
- Merge `"auth guards"` + `"authenticated user redirects away from public pages"` → `"auth redirects and guards"`
- Combined flow: test unauthenticated redirect → authenticate → test `/` and `/login` redirect to `/trips` + existing user skips complete-profile
- Saves 1 auth cycle (currently `authenticateUser` called separately in each test)

**Notification merge** — `notifications.spec.ts`:
- Merge `"notification bell and dropdown journey"` + `"mark all as read and trip notification bell journey"` → `"notification flow"`
- Combined flow: setup organizer + member + trip + 2 messages → verify global bell unread count → click notification → navigate to trip → verify trip bell → open trip notification dialog → mark all as read → verify counts zeroed
- Saves full multi-user setup (~9 API calls: 2 createUserViaAPI + createTripViaAPI + inviteViaAPI + rsvpViaAPI + 2 message posts)

---

## Infrastructure Speed Optimizations

### `inviteAndAcceptViaAPI` cookie reuse

**File**: `apps/web/tests/e2e/helpers/invitations.ts`

Current signature:
```typescript
export async function inviteAndAcceptViaAPI(
  request: APIRequestContext,
  tripId: string,
  inviterPhone: string,
  inviteePhone: string,
  inviteeName: string,
): Promise<void>
```

The function calls `createUserViaAPI(request, inviterPhone)` internally to get a fresh inviter cookie (3 API calls), even when the caller already has it.

New signature (backwards compatible):
```typescript
export async function inviteAndAcceptViaAPI(
  request: APIRequestContext,
  tripId: string,
  inviterPhone: string,
  inviteePhone: string,
  inviteeName: string,
  inviterCookie?: string, // NEW: skip re-auth when provided
): Promise<void>
```

When `inviterCookie` is provided, skip the `createUserViaAPI` call for the inviter and use the cookie directly.

**Callers to update** (pass existing cookie):
- `invitation-journey.spec.ts` — `organizerCookie` available in setup steps
- `trip-journey.spec.ts` — where `organizerCookie` is available
- `messaging.spec.ts` — `organizerCookie` available
- `notifications.spec.ts` — `organizerCookie` available

### Playwright config: increase CI workers

**File**: `apps/web/playwright.config.ts`

```typescript
// Before
workers: process.env.CI ? 2 : 1,

// After
workers: process.env.CI ? 4 : 1,
```

Tests are parallel-safe — `generateUniquePhone()` uses pid + timestamp + counter.

### CI sharding

**File**: `.github/workflows/ci.yml`

Split the E2E job into a matrix with 2 shards:
- Each shard runs `playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}`
- Use `blob` reporter in sharded runs to generate mergeable artifacts
- Add `merge-e2e-reports` job that runs after all shards complete:
  - Downloads blob artifacts from each shard
  - Runs `npx playwright merge-reports --reporter html ./all-blob-reports`
  - Uploads merged HTML report as artifact

---

## CI Pipeline Changes

### Smoke/regression split

**File**: `.github/workflows/ci.yml`

Add new `e2e-smoke` job:
- Runs on PR commits only
- Command: `playwright test --grep @smoke`
- 6 tests, fast feedback

Modify existing `e2e-tests` job:
- Runs on main branch merges only (full suite with sharding)
- All 22 tests across 2 shards

### Tag assignments

`@smoke` (6 tests):
1. `auth: complete auth journey`
2. `trip: trip CRUD journey`
3. `invitation: invitation and RSVP journey`
4. `itinerary: itinerary CRUD journey`
5. `messaging: messaging CRUD journey`
6. `notifications: notification flow` (merged)

`@regression` (16 tests): all remaining tests

### Convenience script

**File**: `apps/web/package.json`

Add: `"test:e2e:smoke": "playwright test --grep @smoke"`

---

## Target State

```
22 tests / 7 files
├── auth-journey.spec.ts        (2: complete auth @smoke, redirects+guards @regression)
├── trip-journey.spec.ts        (6: CRUD @smoke, 5 others @regression)
├── invitation-journey.spec.ts  (5: invite+RSVP @smoke, 4 others @regression)
├── profile-journey.spec.ts     (2: editing @regression, photo @regression)
├── itinerary-journey.spec.ts   (3: CRUD @smoke, view modes + restore @regression)
├── messaging.spec.ts           (2: CRUD @smoke, organizer actions @regression)
└── notifications.spec.ts       (2: notification flow @smoke, — merged)
```
