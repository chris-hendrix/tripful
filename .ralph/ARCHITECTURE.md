# Mobile UX Fixes - Architecture

Comprehensive mobile UX fix pass addressing touch targets, layout bugs, visual polish, phone number formatting, and event count accuracy across the Tripful web app.

## Overview

10 issues identified from a mobile design audit and screenshot analysis. Fixes are primarily frontend with one backend fix (event count query). No database migrations needed.

---

## 1. Touch Target Fixes (44px minimum)

### Strategy

Use responsive sizing: mobile gets 44px+ targets, desktop keeps current compact sizes. Apply via Tailwind responsive prefixes.

### Files & Changes

**`apps/web/src/components/ui/button.tsx`** — Update size variants with mobile-first 44px:

```typescript
size: {
  default: "h-11 sm:h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-9 sm:h-6 gap-1 rounded-md px-3 sm:px-2 text-xs has-[>svg]:px-2 sm:has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-11 sm:h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
  lg: "h-12 sm:h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-11 sm:size-9",
  "icon-xs": "size-9 sm:size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-11 sm:size-8",
  "icon-lg": "size-12 sm:size-10",
}
```

**`apps/web/src/components/ui/input.tsx`** — Update base height from `h-9` to `h-11 sm:h-9`.

**`apps/web/src/components/ui/checkbox.tsx`** — The visual checkbox stays `size-4`. Ensure all label/form-item wrappers provide adequate touch area via padding. No component change needed — verify at usage sites.

---

## 2. Event Count Fix

### Problem

- `trip-detail-content.tsx:222` has hardcoded `"0 events"` string
- `TripDetail` type doesn't include `eventCount`
- Backend `trip.service.ts:497` hardcodes `eventCount: 0` in `TripSummary`

### Solution — Frontend (Trip Detail Page)

Use `useEvents(tripId)` in `TripDetailContent` to get the event count dynamically. The events query is already cached by TanStack Query, so this won't cause a duplicate fetch — it shares the cache key with `ItineraryView`.

**`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`**:
- Import `useEvents` from `@/hooks/use-events`
- Replace hardcoded `"0 events"` (line 222) with dynamic count from events data
- Filter out deleted events (`deletedAt === null`)

### Solution — Backend (Trip Summary)

Count non-deleted events per trip in the list query.

**`apps/api/src/services/trip.service.ts`**:
- In `getTrips()`, add a subquery counting events where `deletedAt IS NULL` grouped by `tripId`
- Replace `eventCount: 0` (line 497) with the actual count from the subquery

### Tests to Update

- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx` — mock `useEvents`, verify dynamic count
- `apps/api/tests/unit/trip.service.test.ts` — verify `eventCount` is computed
- `apps/api/tests/integration/trip.routes.test.ts` — verify `eventCount` in API response

---

## 3. Cover Image Placeholder Fix

### Problem

Empty state gradient (`from-muted to-primary/10`) looks broken. On mobile, hero doesn't span full width.

### Solution

Replace washed-out gradient with vibrant intentional empty state: richer gradient + `ImagePlus` icon from lucide-react + "Add cover photo" CTA for organizers.

### Files & Changes

**`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`** (lines 127-131):
- Replace placeholder div with vibrant gradient (`from-primary/20 via-accent/15 to-secondary/20`)
- Add centered `ImagePlus` icon (lucide-react)
- Add "Add cover photo" text/button for organizers
- Ensure container uses `w-full` explicitly

**`apps/web/src/components/trip/trip-card.tsx`** (lines 104-116):
- Same treatment: replace bland gradient with vibrant one + small centered icon
- Use matching gradient from above

---

## 4. Itinerary Toolbar Mobile Redesign

### Problem

Toolbar crams view toggle + timezone toggle + 3 action buttons into flex rows, overflowing on mobile. Buttons are 32px tall.

### Solution

On mobile: action buttons collapse to icon-only with tooltips. Text labels visible on `sm:` breakpoint and above.

### Files & Changes

**`apps/web/src/components/itinerary/itinerary-header.tsx`**:
- Action buttons: show `<Plus>` icon-only on mobile, full text on `sm:` and above
  - Event → `Plus` icon, `Accommodation` → `Building2` icon, `My Travel` → `Plane` icon
- Wrap icon-only buttons with `Tooltip` for accessibility
- Use responsive text: `<span className="hidden sm:inline">Event</span>`
- All buttons get proper touch targets from updated button component

### Tests

**`apps/web/src/components/itinerary/__tests__/itinerary-header.test.tsx`**:
- Update to account for icon-only rendering
- Verify action buttons still render and are clickable

---

## 5. Toast Notification Positioning

### Problem

Sonner defaults to top-right, may overlap sticky header or iPhone notch.

### Files & Changes

**`apps/web/src/components/ui/sonner.tsx`**:
- Add `position="bottom-right"` prop
- Add `className` with `z-[60]` to ensure toasts render above header (`z-10`) and overlays (`z-50`)

---

## 6. Dialog Backdrop Verification

### Problem

Screenshots show no dimming behind create trip modal. Code has `bg-black/80` overlay.

### Investigation

The overlay code looks correct at `dialog.tsx:42`. Possible causes:
- Screenshot capture timing (animation hadn't completed)
- Portal rendering issue

### Files & Changes

**`apps/web/src/components/ui/dialog.tsx`**:
- Verify overlay z-index is correct (`z-50`)
- Ensure `DialogPortal` renders at document root without clipping parent
- If needed, add explicit `will-change-opacity` or remove animation delay

---

## 7. "Going" Badge on Mobile

### Problem

Badge visible on desktop but missing on mobile in screenshots.

### Investigation

Code at `trip-detail-content.tsx:167-168` renders "Going" badge unconditionally. May be clipping from overflow or layout issue.

### Files & Changes

**`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`**:
- Ensure badge container (`flex items-center gap-2`) has `flex-wrap` on mobile
- Verify no parent container clips the badges

---

## 8. Create Trip Dialog Mobile Scroll

### Problem

Continue button may be obscured on mobile viewport.

### Files & Changes

**`apps/web/src/components/trip/create-trip-dialog.tsx`**:
- Verify `DialogContent` scroll behavior (already has `max-h-[calc(100vh-4rem)] overflow-y-auto`)
- Ensure submit button area has padding at bottom so it's not flush with viewport edge
- If needed, add bottom safe-area padding for iOS (`pb-safe` or `pb-6`)

---

## 9. Phone Number Input + Formatting

### New Dependencies

- `react-phone-number-input` (~800k weekly downloads) — Phone input with country selector
- `libphonenumber-js` (bundled with react-phone-number-input) — Phone parsing/formatting/validation

### Architecture

**New: `apps/web/src/components/ui/phone-input.tsx`**:
- Custom PhoneInput component wrapping `react-phone-number-input`
- Styled to match existing shadcn Input (border, focus ring, height)
- Based on `shadcn-phone-input` pattern by omeralpi
- Integrates with React Hook Form via standard `field` spread

**`apps/web/src/lib/format.ts`**:
- Add `formatPhoneNumber(phone: string): string` using `parsePhoneNumber` from `libphonenumber-js`
- Returns `formatInternational()` for display (e.g., "+1 213 373 4253")
- Graceful fallback to raw string if parsing fails

**`apps/web/src/app/(auth)/login/page.tsx`**:
- Replace `<Input type="tel">` with `<PhoneInput>` component
- Default country: "US"

**`apps/web/src/app/(auth)/verify/page.tsx`**:
- Format displayed phone number using `formatPhoneNumber()` utility

**`shared/schemas/auth.ts`** (wherever `requestCodeSchema` is defined):
- Update phone validation to use `isValidPhoneNumber` from `libphonenumber-js` (server-safe)

---

## 10. Trip Card Cover Image

Already covered in section 3 — same gradient/icon treatment for `trip-card.tsx`.

---

## Testing Strategy

### Unit Tests (Vitest)
- Button/Input component variants — verify class output includes responsive sizes
- Phone number format utility — various formats, edge cases, invalid input
- Event count display — mock `useEvents`, verify dynamic rendering
- Itinerary header — verify icon-only buttons render, tooltips present

### Integration Tests (Vitest)
- Trip service `eventCount` — verify actual counts from DB (not hardcoded 0)
- API route tests — verify `eventCount` in GET /api/trips response

### E2E Tests (Playwright)
- Existing journey tests must still pass (regression)
- Visual screenshots at 375x667 (mobile) and 1280x720 (desktop)

### Manual Testing
- Screenshots of: login, verify, dashboard, trip detail, itinerary views
- Verify touch targets meet 44px minimum on mobile
- Verify phone input with country selector works
- Verify toast positioning doesn't overlap content
