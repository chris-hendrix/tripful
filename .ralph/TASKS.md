# Mobile UX Fixes - Tasks

## Task Status Legend

- `[ ]` - Not started
- `[x]` - Completed

---

## Phase 1: Base Component Fixes

- [x] Task 1.1: Update button, input, and checkbox touch targets to 44px minimum
  - Implement: Update `apps/web/src/components/ui/button.tsx` size variants with responsive mobile-first sizing (`h-11 sm:h-9` pattern for all sizes)
  - Implement: Update `apps/web/src/components/ui/input.tsx` base height from `h-9` to `h-11 sm:h-9`
  - Implement: Verify checkbox usage sites have adequate touch area (no component change needed — checkbox visual stays `size-4`)
  - Test: Verify button and input components render correct responsive classes
  - Test: Run existing component tests to ensure no regressions
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [x] Task 1.2: Fix toast positioning and dialog backdrop
  - Implement: Update `apps/web/src/components/ui/sonner.tsx` — add `position="bottom-right"` and z-index `z-[60]` class
  - Implement: Verify `apps/web/src/components/ui/dialog.tsx` overlay renders correctly (check z-index, portal mounting)
  - Test: Run existing tests to ensure no regressions
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 2: Event Count Fix (Backend + Frontend)

- [x] Task 2.1: Fix hardcoded eventCount in backend and frontend
  - Implement: In `apps/api/src/services/trip.service.ts` `getTrips()` method, add a subquery to count non-deleted events per trip. Replace `eventCount: 0` (line 497) with actual count.
  - Implement: In `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`, import `useEvents` hook and replace hardcoded `"0 events"` (line 222) with dynamic count from events data. Filter out events where `deletedAt !== null`.
  - Test: Update `apps/api/tests/unit/trip.service.test.ts` — verify `eventCount` is computed from actual events, not hardcoded
  - Test: Update `apps/api/tests/integration/trip.routes.test.ts` — verify `eventCount` in API response matches event count
  - Test: Update `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx` — mock `useEvents` and verify dynamic event count rendering
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 3: Cover Image & Visual Fixes

- [x] Task 3.1: Fix cover image placeholder and trip card empty state
  - Implement: In `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` (lines 127-131), replace washed-out gradient with vibrant gradient + `ImagePlus` icon + "Add cover photo" CTA for organizers. Ensure container has `w-full`.
  - Implement: In `apps/web/src/components/trip/trip-card.tsx` (lines 104-116), replace bland gradient with matching vibrant gradient + small centered icon.
  - Test: Update `apps/web/src/components/trip/__tests__/trip-card.test.tsx` — update placeholder test to check for new gradient classes and icon
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [x] Task 3.2: Fix "Going" badge visibility and create trip dialog scroll on mobile
  - Implement: In `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`, add `flex-wrap` to badge container (line 166) to prevent overflow/clipping on mobile
  - Implement: In `apps/web/src/components/trip/create-trip-dialog.tsx`, verify dialog scroll behavior on mobile and add bottom padding to ensure submit button is reachable (add `pb-6` or safe-area padding)
  - Test: Run existing tests to ensure no regressions
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 4: Itinerary Toolbar Mobile Redesign

- [ ] Task 4.1: Collapse itinerary action buttons to icons on mobile
  - Implement: In `apps/web/src/components/itinerary/itinerary-header.tsx`, update action buttons to show icon-only on mobile and full text on `sm:` breakpoint. Use `Building2` for Accommodation, `Plane` for My Travel. Wrap icon buttons with `Tooltip` for accessibility.
  - Implement: Use pattern `<span className="hidden sm:inline ml-1">Event</span>` to toggle text visibility
  - Test: Update `apps/web/src/components/itinerary/__tests__/itinerary-header.test.tsx` — verify buttons still render and are clickable, verify tooltip/aria-label presence
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 5: Phone Number Input & Formatting

- [ ] Task 5.1: Install phone number library and create PhoneInput component
  - Implement: Install `react-phone-number-input` in `apps/web` (`pnpm --filter web add react-phone-number-input`)
  - Implement: Create `apps/web/src/components/ui/phone-input.tsx` — shadcn-styled phone input wrapping `react-phone-number-input` with country selector, matching Input styling (border, focus ring, responsive height)
  - Implement: Add `formatPhoneNumber()` utility to `apps/web/src/lib/format.ts` using `parsePhoneNumber` from `libphonenumber-js` (bundled with react-phone-number-input). Returns `formatInternational()` with graceful fallback.
  - Test: Write unit tests for `formatPhoneNumber()` utility in `apps/web/src/lib/format.test.ts`
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

- [ ] Task 5.2: Integrate phone input into login and verify pages
  - Implement: In `apps/web/src/app/(auth)/login/page.tsx`, replace `<Input type="tel">` with `<PhoneInput>` component, default country "US"
  - Implement: In `apps/web/src/app/(auth)/verify/page.tsx`, format the displayed phone number using `formatPhoneNumber()` utility
  - Test: Update `apps/web/src/app/(auth)/login/page.test.tsx` — verify phone input renders with country selector
  - Test: Update `apps/web/src/app/(auth)/verify/page.test.tsx` — verify formatted phone number display
  - Verify: `pnpm typecheck` passes, `pnpm test` passes

## Phase 6: Final Verification

- [ ] Task 6.1: Full regression check and visual verification
  - Verify: All unit tests pass (`pnpm test`)
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: Type checking passes (`pnpm typecheck`)
  - Verify: Manual browser testing at 375x667 (mobile) and 1280x720 (desktop) with Playwright screenshots of: login, verify, dashboard, trip detail, itinerary views
  - Verify: Touch targets meet 44px minimum on mobile buttons/inputs
  - Verify: Phone input with country selector works end-to-end
  - Verify: Toast notifications don't overlap itinerary content
  - Verify: Cover image placeholders look intentional (not broken)
  - Verify: Event count displays correctly (not hardcoded "0")
