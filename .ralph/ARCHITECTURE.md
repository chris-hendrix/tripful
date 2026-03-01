# Architecture: Skill Audit Remediation

Comprehensive remediation of all findings from the codebase skill audit across 13 skill areas (Next.js, TanStack Query, React Hook Form, API Security, Vercel React, Fastify, shadcn/ui, Playwright, Drizzle ORM, pg-boss, Web Design, Frontend Design, Mobile Design).

---

## 1. Security & Authentication

### 1.1 Token Blacklist

Add JWT blacklisting on logout. Since tokens are 7-day expiry, revocation is critical.

**New schema** in `apps/api/src/db/schema/index.ts`:

```typescript
export const blacklistedTokens = pgTable("blacklisted_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  jti: text("jti").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("blacklisted_tokens_jti_idx").on(t.jti),
  index("blacklisted_tokens_expires_at_idx").on(t.expiresAt),
]);
```

**JWT signing changes** in `apps/api/src/services/auth.service.ts`:

- Add `jti` (UUID) claim when signing tokens: `app.jwt.sign({ sub: userId, name: displayName, jti: randomUUID() })`
- On logout (`POST /api/auth/logout`), decode token and insert `jti` + `expiresAt` into `blacklisted_tokens`

**Auth middleware changes** in `apps/api/src/middleware/auth.middleware.ts`:

- After `request.jwtVerify()`, check `blacklisted_tokens` for the token's `jti`
- If found, throw 401 Unauthorized
- This adds one indexed DB lookup per authenticated request — acceptable at current scale

**Cleanup job**: New pg-boss scheduled job `token-blacklist/cleanup` (daily cron) that deletes entries where `expiresAt < now()`.

### 1.2 Account Lockout

Prevent brute-force OTP attacks. Track failed verification attempts per phone number.

**New schema** in `apps/api/src/db/schema/index.ts`:

```typescript
export const authAttempts = pgTable("auth_attempts", {
  phoneNumber: text("phone_number").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
```

**Logic** in `apps/api/src/services/auth.service.ts`:

- Before verify-code: check if `lockedUntil > now()` → return 429 with retry-after header
- On failed verification: increment `failedCount`, set `lastFailedAt = now()`
- On 5+ failures: set `lockedUntil = now() + 15 minutes`
- On successful verification: delete the row (reset)
- pg-boss cleanup job removes stale entries (older than 24 hours)

### 1.3 Input Length Validation

Add `max()` constraints to unbounded search inputs.

- `shared/schemas/mutuals.ts`: Add `.max(100)` to `search` field in `getMutualsQuerySchema`
- Review all other query schemas for unbounded string params and add appropriate `.max()` constraints

---

## 2. PostgreSQL-Backed Rate Limiting

Replace the in-memory rate limit store with a PostgreSQL-backed custom store for `@fastify/rate-limit`.

**New schema** in `apps/api/src/db/schema/index.ts`:

```typescript
export const rateLimitEntries = pgTable("rate_limit_entries", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("rate_limit_entries_expires_at_idx").on(t.expiresAt),
]);
```

**Custom store** — new file `apps/api/src/plugins/pg-rate-limit-store.ts`:

```typescript
import { sql } from "drizzle-orm";

class PgRateLimitStore {
  constructor(private db: DrizzleDB, private timeWindow: number) {}

  incr(key: string, cb: (err: Error | null, result?: { current: number; ttl: number }) => void) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + this.timeWindow);

    this.db.execute(sql`
      INSERT INTO rate_limit_entries (key, count, expires_at)
      VALUES (${key}, 1, ${windowEnd})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_entries.expires_at <= ${now} THEN 1
          ELSE rate_limit_entries.count + 1
        END,
        expires_at = CASE
          WHEN rate_limit_entries.expires_at <= ${now} THEN ${windowEnd}
          ELSE rate_limit_entries.expires_at
        END
      RETURNING count, EXTRACT(EPOCH FROM (expires_at - ${now}::timestamptz)) * 1000 AS ttl
    `).then((result) => {
      const row = result.rows[0] as { count: number; ttl: number };
      cb(null, { current: row.count, ttl: row.ttl });
    }).catch((err) => cb(err as Error));
  }

  child(routeOptions: { timeWindow?: number }) {
    return new PgRateLimitStore(this.db, routeOptions.timeWindow ?? this.timeWindow);
  }
}
```

**Registration** in `apps/api/src/app.ts`:

- Pass `store: PgRateLimitStore` to `@fastify/rate-limit` registration
- Store receives DB instance from the database plugin

**Cleanup**: pg-boss job `rate-limit/cleanup` (hourly cron) deletes entries where `expiresAt < now()`.

---

## 3. pg-boss Queue Fixes

All changes in `apps/api/src/queues/index.ts`:

### 3.1 Add Expiration & DLQ

```typescript
// notification/batch — add expiration and DLQ
await boss.createQueue(QUEUE.NOTIFICATION_BATCH_DLQ);
await boss.createQueue(QUEUE.NOTIFICATION_BATCH, {
  retryLimit: 3,
  retryDelay: 10,
  retryBackoff: true,
  expireInSeconds: 300,
  deadLetter: QUEUE.NOTIFICATION_BATCH_DLQ,
  deleteAfterSeconds: 3600,
});

// daily-itineraries — add expiration and DLQ
await boss.createQueue(QUEUE.DAILY_ITINERARIES_DLQ);
await boss.createQueue(QUEUE.DAILY_ITINERARIES, {
  retryLimit: 2,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 600,
  deadLetter: QUEUE.DAILY_ITINERARIES_DLQ,
  deleteAfterSeconds: 3600,
});
```

### 3.2 DLQ Workers

New file `apps/api/src/queues/workers/dlq.worker.ts`:

- Register workers for all 4 DLQ queues
- Log failed jobs at `error` level with full payload for monitoring
- In future: integrate with alerting (out of scope for now)

### 3.3 Queue Constants

Add new queue names to `apps/api/src/queues/types.ts`:

```typescript
export const QUEUE = {
  // ... existing
  NOTIFICATION_BATCH_DLQ: "notification/batch/dlq",
  DAILY_ITINERARIES_DLQ: "daily-itineraries/dlq",
  TOKEN_BLACKLIST_CLEANUP: "token-blacklist/cleanup",
  RATE_LIMIT_CLEANUP: "rate-limit/cleanup",
  AUTH_ATTEMPTS_CLEANUP: "auth-attempts/cleanup",
} as const;
```

---

## 4. API Quality

### 4.1 Response Schemas

Add Zod response schemas to the 3 routes currently missing them:

| Route | File | Line |
|-------|------|------|
| `DELETE /trips/:tripId/members/:memberId` | `invitation.routes.ts` | 152 |
| `GET /mutuals` | `mutuals.routes.ts` | 29 |
| `GET /trips/:tripId/mutual-suggestions` | `mutuals.routes.ts` | 45 |

Define response schemas in `shared/schemas/` matching existing patterns, then reference in route `schema.response[200]`.

### 4.2 OpenAPI / Swagger

**New packages**: `@fastify/swagger`, `@fastify/swagger-ui`

**New plugin** `apps/api/src/plugins/swagger.ts`:

```typescript
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default fp(async function swaggerPlugin(fastify) {
  await fastify.register(swagger, {
    openapi: {
      info: { title: "Tripful API", version: "1.0.0" },
      servers: [{ url: `http://localhost:${fastify.config.PORT}` }],
      components: {
        securitySchemes: {
          cookieAuth: { type: "apiKey", in: "cookie", name: "auth_token" },
        },
      },
    },
    transform: jsonSchemaTransform, // from fastify-type-provider-zod
  });

  await fastify.register(swaggerUi, { routePrefix: "/docs" });
});
```

Register before routes in `apps/api/src/app.ts`. Only enabled when `NODE_ENV !== "production"` (or controlled via env var).

### 4.3 Drizzle Query Logging

**New plugin** `apps/api/src/plugins/query-logger.ts`:

Create a Drizzle-compatible logger that integrates with Fastify's pino logger. Logs all queries at `debug` level. Warns on slow queries (>500ms).

Pass logger to Drizzle initialization in `apps/api/src/plugins/database.ts`.

### 4.4 Fix Bare `select()` Calls

Add explicit column selection to all 20+ bare `select()` calls:

| Service | Lines | Action |
|---------|-------|--------|
| `auth.service.ts` | 83, 117 | Select only id, phoneNumber, displayName, createdAt |
| `trip.service.ts` | 236, 336, 443, 465, 707, 726, 817, 833 | Select columns needed per query context |
| `invitation.service.ts` | 533, 595, 906, 992 | Select only required invitation/member fields |
| `accommodation.service.ts` | 211, 279, 420 | Select accommodation detail fields |
| `event.service.ts` | 208 | Select event detail fields |
| `member-travel.service.ts` | 242, 439 | Select member travel fields |

For each, identify what the consumer (route handler / response schema) actually needs and select only those columns.

### 4.5 OFFSET → Cursor Pagination

Convert 3 services from OFFSET to cursor-based pagination. Breaking API change — update frontend consumers simultaneously.

**Cursor format**: Base64-encoded JSON with sort key + id for deterministic ordering.

```typescript
// Shared cursor utility — apps/api/src/utils/pagination.ts
export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(cursor, "base64url").toString());
}
```

**Services to convert:**

| Service | Line | Sort Key | Cursor Fields |
|---------|------|----------|---------------|
| `trip.service.ts` | 451 | `createdAt DESC` | `{ createdAt, id }` |
| `notification.service.ts` | 166 | `createdAt DESC` | `{ createdAt, id }` |
| `message.service.ts` | 185 | `createdAt DESC` | `{ createdAt, id }` |

**Schema changes** in `shared/schemas/`:

- Replace `page`/`offset` params with `cursor?: string` and `limit: number`
- Response includes `nextCursor: string | null` instead of `totalPages`/`totalCount`

**Frontend changes**:

- `apps/web/src/hooks/trip-queries.ts` — switch to `useInfiniteQuery` with `getNextPageParam` extracting `nextCursor`
- `apps/web/src/hooks/notification-queries.ts` — update cursor param
- `apps/web/src/hooks/message-queries.ts` — update cursor param
- Update all consuming components to use `data.pages.flatMap(p => p.items)` pattern

### 4.6 Partial Indexes for Soft-Delete

Add `WHERE "deleted_at" IS NULL` partial indexes on soft-delete tables. New migration.

```sql
CREATE INDEX IF NOT EXISTS events_trip_id_not_deleted_idx
  ON events (trip_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS accommodations_trip_id_not_deleted_idx
  ON accommodations (trip_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS member_travel_trip_id_not_deleted_idx
  ON member_travel (trip_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS messages_trip_id_not_deleted_idx
  ON messages (trip_id) WHERE deleted_at IS NULL AND parent_id IS NULL;
```

---

## 5. Frontend Data Layer

### 5.1 TanStack Query — Move `enabled` to Call Sites

Move `enabled` from query factory options to `useQuery()` call sites in 8 files (19 occurrences):

| Factory File | Lines |
|-------------|-------|
| `trip-queries.ts` | 63 |
| `accommodation-queries.ts` | 37, 54, 73 |
| `invitation-queries.ts` | 60, 77, 94 |
| `member-travel-queries.ts` | 37, 54, 73 |
| `message-queries.ts` | 41, 58, 75 |
| `event-queries.ts` | 37, 54, 73 |
| `mutuals-queries.ts` | 70 |
| `notification-queries.ts` | 107, 127 |

**Pattern**: Remove `enabled: !!id` from `queryOptions()` factory, add it at each `useQuery(factory(id), { enabled: !!id })` call site in the corresponding `use-*.ts` hook files.

### 5.2 TanStack Query — Add Missing Features

**`useMutationState` for global loading indicator:**

New component `apps/web/src/components/global-mutation-indicator.tsx` — thin progress bar at top of viewport when any mutation is pending. Add to `apps/web/src/app/(app)/layout.tsx`.

**`select` for partial data:**

Add `select` option in components that only need subset of query data. Identify 3-5 key opportunities during implementation (e.g., member lists that only need name + avatar).

**`placeholderData` for pagination:**

In paginated queries (trips, messages, notifications), add `placeholderData: keepPreviousData` to prevent content flash during page transitions.

**`QueryErrorResetBoundary`:**

Wrap error-prone query sections with `QueryErrorResetBoundary` + React Error Boundary in `apps/web/src/app/(app)/layout.tsx`. Update `ErrorBoundary` component to accept `onReset` prop and call it on retry.

### 5.3 React Hook Form Fix

In `shared/schemas/invitation.ts`: Add `path: ["phoneNumbers"]` to the `.refine()` call that validates at least one of `phoneNumbers` or `userIds` is provided.

### 5.4 React Pattern Fixes

**Fix useEffect deps** in `apps/web/src/app/(app)/trips/trips-content.tsx`:

- Remove `router`, `searchParams`, `pathname` from useEffect dependency array (lines 48-65)
- Read `searchParams.toString()` inside the effect without listing it as a dep
- Use a ref for `router` and `pathname` if needed

**Extract SkeletonCard** in `apps/web/src/app/(app)/trips/trips-content.tsx`:

- Move `SkeletonCard` component definition outside `TripsContent` to module level (around line 13-37)

**Move endDate auto-fill** in `apps/web/src/components/trip/create-trip-dialog.tsx`:

- Remove the `useEffect` (lines 79-83) that sets endDate when startDate changes
- Move logic into the `onChange` handler of the startDate DatePicker

**Parallelize trip detail fetching** in `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`:

- Remove conditional `enabled` that sequences event loading after trip loading
- Fetch trip details, events, members, accommodations in parallel (all have tripId from URL params)

---

## 6. UI Component Fixes

### 6.1 shadcn/ui Token Fixes

**RsvpBadge** (`apps/web/src/components/ui/rsvp-badge.tsx`):

Replace hardcoded colors with theme tokens:

```typescript
// Before: "bg-amber-500/15 text-amber-600 border-amber-500/30"
// After:  "bg-warning/15 text-warning border-warning/30"

// Before (overlay): "text-emerald-300", "text-amber-300", "text-neutral-300"
// After: Use CSS custom properties or theme-aware overlay tokens
```

**ErrorBoundary** (`apps/web/src/components/error-boundary.tsx`):

- Replace raw `<button>` with `<Button>` component from `@/components/ui/button`
- Use appropriate variant (`default` or `gradient`)
- Update `ErrorBoundary` to accept `onReset` prop for `QueryErrorResetBoundary` integration

**MutualProfileSheet** (`apps/web/src/components/mutuals/mutual-profile-sheet.tsx`):

- Replace inline link classes (line 71) with `cn()` utility and standard link patterns

### 6.2 Next.js Route Improvements

**Add `loading.tsx`:**

| Path | Purpose |
|------|---------|
| `apps/web/src/app/(app)/mutuals/loading.tsx` | Mutuals page skeleton |
| `apps/web/src/app/(auth)/loading.tsx` | Auth group loading state |

Each `loading.tsx` renders a skeleton matching the page layout.

### 6.3 WCAG AA Color Contrast

In `apps/web/src/app/globals.css`:

Darken `--color-muted-foreground` from `#6b6054` to meet 4.5:1 contrast ratio against `--color-background` (`#fbf6ef`).

Current: `#6b6054` → contrast ratio ~3.8:1 against `#fbf6ef` (fails AA for small text)
Target: `#5a5046` or similar → contrast ratio ≥4.5:1 (passes AA)

Verify all muted-foreground usage still looks good after the change.

---

## 7. Design System Refresh — Adventurous / Exploratory

### 7.1 Third Accent Font: Space Grotesk

**Setup** in `apps/web/src/app/layout.tsx`:

```typescript
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
```

Add `spaceGrotesk.variable` to the body className.

**Add to theme** in `globals.css`:

```css
@theme {
  --font-accent: var(--font-space-grotesk);
}
```

**Usage**: Apply `font-accent` to:

- Navigation labels in app header
- Badge/tag text (RSVP status, event types)
- Hero section numbers/stats (trip count, member count)
- Button labels on primary CTAs
- Section subheadings
- Feature callouts and empty state headings

### 7.2 Scroll-Triggered Animations

Create a reusable `useScrollReveal` hook and CSS classes:

**New hook** `apps/web/src/hooks/use-scroll-reveal.ts`:

Uses IntersectionObserver (threshold: 0.1) to add a `revealed` class when element enters viewport. Observer disconnects after reveal (one-shot).

**New animations** in `globals.css`:

```css
@keyframes revealUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes revealScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes staggerIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

**Staggered card grids**: Apply `animation-delay` based on card index using inline style `style={{ animationDelay: `${index * 80}ms` }}` with the `staggerIn` animation. Use `motion-safe:` prefix.

### 7.3 Gradient Mesh & Texture Backgrounds

**Hero gradient mesh** — new CSS class in `globals.css`:

```css
.gradient-mesh {
  background:
    radial-gradient(ellipse at 20% 50%, #1a5c9e15 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, #d1643d10 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, #497e5a08 0%, transparent 50%),
    var(--color-background);
}
```

Apply to page-level containers (trips list, mutuals page, auth pages).

**Noise texture overlay** — subtle grain via CSS pseudo-element on card/page backgrounds for depth (~3% opacity).

### 7.4 Asymmetric Layouts

**Trips list hero**: Instead of symmetric grid, use CSS Grid with named areas for featured/recent trip section:

```css
.trips-hero-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 1rem;
}
.trips-hero-grid > :first-child {
  grid-row: span 2; /* Featured trip spans 2 rows */
}
```

**Trip detail hero**: Offset trip image/header with angled clip-path or skew transform for dynamic visual.

### 7.5 Enhanced Card & Interaction Effects

**Hover lift** on TripCard, EventCard:

```css
.card-hover {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
}
```

**Active press** feedback: `motion-safe:active:scale-[0.98]` on interactive cards.

### 7.6 Page Transition Orchestration

Use `motion-safe:animate-[revealUp_400ms_ease-out_both]` on page content containers with staggered delays for header, main content, and sidebar sections.

### 7.7 Decorative Elements

Increase compass/decorative element opacity from `0.04` to `0.08-0.12` for more presence. Add topographic line pattern SVG as decorative background on empty states.

---

## 8. Mobile UX

### 8.1 Responsive Hamburger Menu

**New component** `apps/web/src/components/mobile-nav.tsx`:

- Visible only below `md` breakpoint (768px)
- Hamburger icon button (Menu icon from lucide-react)
- Opens Sheet (side="left") with navigation:
  - User avatar + name at top
  - Links: My Trips, My Mutuals
  - Separator
  - Profile, Log out

**App Header changes** (`apps/web/src/components/app-header.tsx`):

- Desktop (≥md): Current layout unchanged
- Mobile (<md): Show hamburger + brand + notification bell only
- Hide user avatar dropdown on mobile (moved into mobile nav sheet)

### 8.2 Responsive Dialog Wrapper

**New component** `apps/web/src/components/ui/responsive-dialog.tsx`:

Uses `useMediaQuery("(min-width: 768px)")` to switch between Dialog (desktop) and Sheet side="bottom" (mobile).

Exports: `ResponsiveDialog`, `ResponsiveDialogContent`, `ResponsiveDialogHeader`, `ResponsiveDialogTitle`, `ResponsiveDialogDescription`, `ResponsiveDialogFooter` — each maps to Dialog or Sheet equivalent.

**New hook** `apps/web/src/hooks/use-media-query.ts`:

SSR-safe media query hook using `window.matchMedia` with event listener for changes.

**Convert dialogs** (15 components):

- `create-trip-dialog.tsx`, `edit-trip-dialog.tsx`, `invite-members-dialog.tsx`
- `create-event-dialog.tsx`, `edit-event-dialog.tsx`
- `create-accommodation-dialog.tsx`, `edit-accommodation-dialog.tsx`
- `create-member-travel-dialog.tsx`, `edit-member-travel-dialog.tsx`
- `deleted-items-dialog.tsx`
- `trip-notification-dialog.tsx`
- `profile-dialog.tsx`

Replace Dialog imports with ResponsiveDialog equivalents.

### 8.3 Hover Media Query Fixes

Add `@media (hover: hover)` guard around hover-dependent interactions:

- Preload on `onMouseEnter` in trip cards, dialog triggers
- For touch devices, use `onFocus` or `onTouchStart` instead

---

## 9. Testing Infrastructure

### 9.1 Playwright Cross-Browser + Mobile

Update `apps/web/playwright.config.ts`:

```typescript
projects: [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1080 } },
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "iphone",
    use: { ...devices["iPhone 14"] },
  },
  {
    name: "ipad",
    use: { ...devices["iPad Mini"] },
  },
],
```

### 9.2 Hard-Coded Timeout Cleanup

Replace all inline timeout numbers with named constants from `tests/e2e/helpers/timeouts.ts`.

Files with inline timeouts to fix:

| File | Approx Occurrences |
|------|-------------------|
| `trip-journey.spec.ts` | ~28 |
| `profile-journey.spec.ts` | ~10 |
| `invitation-journey.spec.ts` | ~12 |
| `itinerary-journey.spec.ts` | ~12 |
| `helpers/itinerary.ts` | 1 |
| `helpers/pages/trips.page.ts` | 1 |
| `helpers/pages/profile.page.ts` | 1 |
| `helpers/trips.ts` | 2 |

Add new constants as needed (e.g., `INTERACTION_TIMEOUT = 5_000` for click/fill waits).

### 9.3 Web Design Fixes

**Decorative image alt text**: Find images that are purely decorative and ensure they have `alt=""`.

**Timezone list expansion**: If the timezone selector only has 6 US entries, expand to include major international timezones (Europe, Asia, Oceania).

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Rate limit store, token blacklist service, account lockout logic, cursor pagination utils, query logging |
| Integration | Vitest | Auth endpoints (blacklist, lockout), rate limiting behavior, cursor pagination endpoints, response schema validation |
| E2E | Playwright | Cross-browser test suite, mobile viewport flows, design refresh visual checks |
| Manual | Playwright CLI | Design refresh visual verification, mobile hamburger menu, bottom-sheet dialogs, animation behavior |
| Type check | `pnpm typecheck` | All packages compile |
| Lint | `pnpm lint` | No new lint errors |
