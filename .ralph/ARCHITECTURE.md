# Architecture: Skill Audit Fixes

Comprehensive codebase quality fixes based on the 14-skill audit (~90 findings). Covers security, accessibility, test reliability, component standardization, performance, mobile responsiveness, and design improvements.

## Excluded Findings

| Finding | Reason |
|---------|--------|
| High #13: Redis rate limiter | MVP stage, single-instance deployment |
| Medium #21: JWT expiry (7d → 1h) | Keep at 7 days for MVP |
| Medium #23: Incomplete CSP | API-only server — restrictive CSP is correct |
| Medium #5: Polling → WebSockets | Architecture change — separate feature |
| Medium #9: reply.status/code mix | Non-issue: all 100+ usages are `reply.status()` |
| Low #5: Missing response schemas | Non-issue: schemas defined on all routes |
| Medium #25/#26: Member access control | Non-issue: properly enforced with permission checks |
| Low #19: CSRF token | Mitigated by SameSite + JWT |
| Low #20: Rate limit on member enum | Access control already enforced |
| Low #21: Privacy documentation | Not a code change |
| Low #28: Custom cursor | Too minor/subjective |

---

## Phase 1: Quick Wins & Critical Fixes

### 1A. Meta & Viewport

**Viewport export** — `apps/web/src/app/layout.tsx`:

```typescript
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1a1814",
};
```

**Apple web app meta** — extend existing `metadata` export:

```typescript
export const metadata: Metadata = {
  title: { default: "Tripful", template: "%s | Tripful" },
  description: "Plan and share your adventures",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tripful",
  },
};
```

**Missing page metadata** — add `export const metadata` to:
- `apps/web/src/app/verify/page.tsx`: `{ title: "Verify" }`
- `apps/web/src/app/complete-profile/page.tsx` (or equivalent): `{ title: "Complete Profile" }`

**Noscript** — add to `layout.tsx` body:

```html
<noscript>
  <div style={{ padding: "2rem", textAlign: "center" }}>
    Tripful requires JavaScript to run. Please enable JavaScript in your browser.
  </div>
</noscript>
```

**hidePoweredBy** — `apps/api/src/app.ts` helmet config:

```typescript
await app.register(helmet, {
  hidePoweredBy: true,
  // ... existing config
});
```

### 1B. JWT Security

**Remove phone from JWT** — `apps/api/src/services/auth.service.ts:333-337`:

```typescript
// Before
const payload = { sub: user.id, phone: user.phoneNumber, ...(user.displayName && { name: user.displayName }) };
// After
const payload = { sub: user.id, ...(user.displayName && { name: user.displayName }) };
```

**Update JWTPayload type** — `apps/api/src/types/index.ts`:

```typescript
export interface JWTPayload {
  sub: string;
  name?: string;
  iat: number;
  exp: number;
}
```

Remove `phone` references from test fixtures, mocks, and middleware comments.

**Cache-control headers** — add `no-store` on auth and sensitive endpoints via a Fastify `onSend` hook or per-route:

```typescript
reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
reply.header("Pragma", "no-cache");
```

### 1C. Schema & Data Fixes

**mutedBy onDelete** — `apps/api/src/db/schema/index.ts` (~line 503):

The `.references()` exists but lacks `onDelete`. Add cascade:

```typescript
mutedBy: uuid("muted_by")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

Generate + apply migration: `cd apps/api && pnpm db:generate && pnpm db:migrate`

**pg-boss retention** — add `retentionMinutes` (or equivalent) to DAILY_ITINERARIES cron job to prevent row accumulation (96/day). Check pg-boss docs for exact option name.

**Redundant index** — review `tripIdIsOrganizerIdx` on members table; if the FK on `tripId` already provides an index, this composite may be unnecessary. Verify with `\di` in psql.

### 1D. Global Error Handler

**File**: `apps/web/src/app/global-error.tsx`

Extract `error` from destructuring, display `error.message`:

```typescript
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html><body>
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Something went wrong</h2>
        <p>{error.message || "An unexpected error occurred."}</p>
        <button onClick={reset}>Try again</button>
      </div>
    </body></html>
  );
}
```

---

## Phase 2: Component Library Standardization

### 2A. Radix Import Migration

Migrate 6 files from `@radix-ui/react-*` to unified `"radix-ui"`:

| File | Old Import | New Import |
|------|-----------|------------|
| `ui/select.tsx` | `import * as SelectPrimitive from "@radix-ui/react-select"` | `import { Select as SelectPrimitive } from "radix-ui"` |
| `ui/label.tsx` | `import * as LabelPrimitive from "@radix-ui/react-label"` | `import { Label as LabelPrimitive } from "radix-ui"` |
| `ui/badge.tsx` | `import { Slot } from "@radix-ui/react-slot"` | `import { Slot } from "radix-ui"` → use `Slot.Root` |
| `ui/form.tsx` | `import type * as LabelPrimitive from "@radix-ui/react-label"` + `import { Slot } from "@radix-ui/react-slot"` | `import { Label as LabelPrimitive, Slot } from "radix-ui"` → use `Slot.Root` |
| `ui/sheet.tsx` | `import * as DialogPrimitive from "@radix-ui/react-dialog"` | `import { Dialog as DialogPrimitive } from "radix-ui"` |
| `ui/dialog.tsx` | `import * as DialogPrimitive from "@radix-ui/react-dialog"` | `import { Dialog as DialogPrimitive } from "radix-ui"` |

After migration, update `Slot` → `Slot.Root` in badge.tsx and form.tsx. Other components already use the `Primitive.Root`, `Primitive.Content`, etc. pattern — verify subcomponent access works.

### 2B. Focus & "use client"

**Focus styling** — standardize all `focus:ring` / `focus:outline` to `focus-visible:ring` / `focus-visible:outline` across `components/ui/`. Unify ring width and color between dialog/sheet components and button/input components.

**"use client" directives** — add to:
- `button.tsx` (imports Slot from radix-ui)
- `input.tsx` (receives event handlers)
- `card.tsx` (defensive)
- `badge.tsx` (imports Slot from radix-ui)

**Select CVA** — refactor Select's size handling to use `cva` variant pattern (matching Button's approach).

---

## Phase 3: Form & Data Layer

### 3A. Form Fixes

**Timezone select** — `components/itinerary/create-event-dialog.tsx:256-279`:

Replace local `useState` with `FormField`:

```tsx
<FormField
  control={form.control}
  name="timezone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Timezone</FormLabel>
      <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
        <SelectContent>
          {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

Ensure `timezone` is in the form's Zod schema. Remove `selectedTimezone` useState.

**Duplicate key** — `edit-event-dialog.tsx:543`: Replace composite key with `field.id` from `useFieldArray`.

**Server error mapping** — create `apps/web/src/lib/form-errors.ts`:

```typescript
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { APIError } from "@/lib/api";

export function mapServerErrors<T extends FieldValues>(
  error: Error,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>>
): boolean {
  if (!(error instanceof APIError)) return false;
  const fieldName = fieldMap[error.code];
  if (fieldName) {
    setError(fieldName, { type: "server", message: error.message });
    return true;
  }
  return false;
}
```

Update form dialogs: in `onError`, try `mapServerErrors()` first, fall back to toast for unmapped errors.

### 3B. TanStack Query

**Mutation error types** — add `APIError` as the error generic parameter:

```typescript
useMutation<ResponseType, APIError, InputType>({...})
```

Review all mutation hooks for callback signature completeness (existing signatures appear correct per research).

### 3C. Notification Bell

**Animation re-trigger** — the class is hard-coded in JSX AND manipulated via useEffect, causing re-trigger to fail. Fix using React key technique:

```tsx
<span key={displayCount} className="... motion-safe:animate-[badgePulse_600ms_ease-in-out]">
```

Remove the `useRef` + `useEffect` approach. The `key` change forces React to remount and re-trigger the animation.

**Conditional rendering** — `{displayCount && ...}` → `{displayCount ? ... : null}` to prevent falsy value rendering.

**Memoize** — apply `useMemo` to any derived state computation if warranted.

### 3D. useCallback Cleanup

`itinerary/group-by-type-view.tsx:82-93` — remove `useCallback` wrappers around trivial state setters.

---

## Phase 4: API Backend

### 4A. Query Optimizations

**N+1 in getTripById** — `services/trip.service.ts:349-366`:

Replace sequential queries with a single join/`with`:

```typescript
const trip = await db.query.trips.findFirst({
  where: eq(trips.id, tripId),
  with: { members: { with: { user: true } } },
});
```

**Existence checks** — `services/event.service.ts:140-144` and others:

Replace `SELECT *` with minimal select:

```typescript
const [exists] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
```

**Sequential counts** — `services/notification.service.ts:133-147`:

Combine into single query with conditional aggregation:

```typescript
const [counts] = await db.select({
  total: count(),
  unread: count(sql`CASE WHEN ${notifications.readAt} IS NULL THEN 1 END`),
}).from(notifications).where(eq(notifications.userId, userId));
```

### 4B. HTTP & Plugin Improvements

**405 distinction** — `app.ts:202-211`: Ensure not-found handler includes method info in error message. Fastify handles 405 for registered routes natively — verify this works correctly.

**Hook execution order** — `routes/trip.routes.ts:99-101`: Move rate limiting before auth in `preHandler` arrays:

```typescript
preHandler: [fastify.rateLimit(writeRateLimitConfig), authenticate, requireCompleteProfile],
```

**Plugin metadata** — add `fastify-plugin` metadata (`fastify: "5.x"`, `name`, `decorators`) to service plugins.

**useDefaults AJV** — add `useDefaults: true` to AJV compiler if not set.

### 4C. Auth Middleware for SSR

Add `apps/web/src/middleware.ts` to redirect unauthenticated users from protected routes:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/trips/:path*", "/settings/:path*"] };
```

---

## Phase 5: Accessibility

### 5A. ARIA Improvements

**aria-live** — add `aria-live="polite"` to:
- Notification count badge
- Toast container (verify sonner handles this)
- Form validation error containers
- Loading → content transitions

**aria-required** — add `aria-required="true"` to required form fields. Check if shadcn `FormItem` handles this automatically.

**aria-describedby** — link error messages to form inputs (e.g., `create-trip-dialog.tsx:526`).

**autocomplete** — add to:
- Phone inputs: `autoComplete="tel"`
- Name inputs: `autoComplete="name"`
- Display name: `autoComplete="nickname"`

### 5B. Color Contrast & URL State

**Color contrast** — `--color-muted-foreground: #8c8173` may fail WCAG AA (4.5:1). Darken to pass — e.g., `#6b6054` while maintaining warm tone. Verify with contrast checker against all backgrounds.

**Search URL state** — persist search queries using `useSearchParams`:

```typescript
const searchParams = useSearchParams();
const [query, setQuery] = useState(searchParams.get("q") ?? "");
router.replace(`?q=${encodeURIComponent(query)}`, { scroll: false });
```

**Dialog URL state** — evaluate if persisting dialog open state adds UX value. Implement for create-trip if beneficial.

---

## Phase 6: E2E Test Modernization

### Locator Strategy

| Old Pattern | New Pattern |
|-------------|------------|
| `page.locator('input[type="tel"]')` | `page.getByRole("textbox", { name: /phone/i })` |
| `page.locator('button:has-text("Continue")')` | `page.getByRole("button", { name: "Continue" })` |
| `page.locator('input[name="name"]')` | `page.getByLabel(/name/i)` |
| `.first()` on generic locator | Specific locator targeting exact element |

**Auto-wait fixes**:
- Replace `.textContent()` polling → `await expect(el).toHaveText(expected)`
- Replace `.isVisible()` checks → `await expect(el).toBeVisible()`
- Replace `page.evaluate()` DOM manipulation → Playwright's built-in interactions

**expect.soft()** — for non-critical assertions (optional UI elements).

**Helper consolidation** — move inline helpers from spec files to `e2e/helpers/`.

---

## Phase 7: Mobile & Responsive

**Touch targets** — current pattern `h-11 sm:h-9` shrinks from 44px to 36px. Fix:
- Button/input: keep 44px minimum, or use `h-9 min-h-11` for visual 36px with 44px tap area
- Checkbox/radio: add padding around 16px visual to reach 44px touch area

**Mobile-first CSS** — flip `h-11 sm:h-9` to true mobile-first if intended (or keep large everywhere).

**FAB padding** — use safe area insets or 80-100px bottom margin to clear mobile browser nav.

**SM breakpoint consistency** — audit all `sm:` overrides for consistent breakpoint behavior.

---

## Phase 8: Frontend Design & Typography

### Font Replacement

Replace DM Sans with Plus Jakarta Sans in `apps/web/src/lib/fonts.ts`:

```typescript
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
```

Update `globals.css`: `--font-sans: var(--font-plus-jakarta);`
Update `layout.tsx` class to use new variable.

### Animations

Add to `globals.css`:

```css
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
```

Apply staggered reveals using `style={{ animationDelay: `${i * 50}ms` }}`.

### Micro-interactions

- Button: `active:scale-[0.97] transition-transform`
- Card: `hover:-translate-y-0.5 hover:shadow-md transition-all`
- Background: subtle gradient overlays `linear-gradient(to bottom, var(--color-background), var(--color-muted))`

### Styling

- Button: subtle shadow, refined border-radius
- Input: focus transitions, subtle inner shadow, potentially rounded-xl
- Skeleton loaders: component-shaped skeletons instead of generic rectangles

---

## Testing Strategy

| Phase | Verification |
|-------|-------------|
| 1. Quick Wins | Unit tests for JWT. Integration tests for auth. Typecheck for schema. |
| 2. Component Lib | Typecheck + dev server. E2E smoke. |
| 3. Forms | Unit tests for error mapping. E2E for timezone. |
| 4. API Backend | Integration tests for queries. Unit tests for middleware. |
| 5. Accessibility | Manual axe audit. Contrast checker. |
| 6. E2E Tests | Full E2E suite with new locators. |
| 7. Mobile | Manual browser at mobile viewport. Screenshots. |
| 8. Design | Visual review. Screenshots. |
| Final | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` |
