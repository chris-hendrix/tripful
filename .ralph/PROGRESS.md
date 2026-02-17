# Ralph Progress

Tracking implementation progress for Post-RSVP Onboarding Wizard feature.

---

## Iteration 1 — Task 1.1: Create MemberOnboardingWizard ✅

**Status**: COMPLETED

### Files Created
- `apps/web/src/components/trip/member-onboarding-wizard.tsx` — Multi-step Sheet wizard component (~400 lines)
- `apps/web/src/components/trip/__tests__/member-onboarding-wizard.test.tsx` — 23 unit tests (~910 lines)

### Files Modified
- `apps/web/src/components/trip/index.ts` — Added barrel export for MemberOnboardingWizard

### What Was Implemented
- **Step 0 (Arrival)**: DateTimePicker pre-populated from `trip.startDate` + location Input. "Next" saves via `useCreateMemberTravel({ travelType: "arrival" })`.
- **Step 1 (Departure)**: DateTimePicker pre-populated from `trip.endDate` + location Input pre-filled from arrival. "Next" saves via `useCreateMemberTravel({ travelType: "departure" })`.
- **Step 2 (Events, conditional)**: Only shown when `canAddEvents` (organizer or `allowMembersToAddEvents`). Quick-add form with name + DateTimePicker + "Add" button. Uses `useCreateEvent()`, shows chips.
- **Step N-1 (Done)**: Summary of saved items + "View Itinerary" button closes wizard.
- **Navigation**: Back (not on step 0), Skip (ghost), Next (gradient + Loader2 spinner while pending).
- **Progress dots**: Filled primary for current/completed, muted for future, "Step X of Y" text.
- **State reset**: useEffect resets all state when wizard reopens (matching codebase pattern).
- **Error handling**: toast.error() on all mutation failures.
- **Departure pre-fill**: useEffect-based pre-fill from arrival location (no render-time side effects).

### Test Coverage (23 tests)
- Rendering (open/closed state, correct step count)
- Step navigation forward/back
- Skip behavior (advances without API call)
- Arrival form submission (verifies correct API body)
- Departure location pre-fill from arrival
- Events step conditionally rendered based on canAddEvents
- Event creation flow (add event, verify chip appears)
- Done summary reflects saved data
- Navigation button visibility per step
- Null date handling (no pre-population when dates missing)
- Styling verification (Playfair font, progress dots)

### Verification Results
- `pnpm typecheck`: PASS (all 3 packages)
- `pnpm test` (specific file): PASS (23/23 tests)
- `pnpm test` (all frontend): PASS (1047 pass, 7 pre-existing failures unrelated to this change)
- `pnpm lint`: PASS (all 3 packages)

### Reviewer Feedback & Resolution
- Initial review: NEEDS_WORK (5 items)
  1. Merged duplicate timezone imports → Fixed
  2. Added state reset useEffect on wizard reopen → Fixed
  3. Moved departure pre-fill from render to useEffect → Fixed
  4. Added onError toast callbacks to all mutations → Fixed
  5. Added event creation flow test → Fixed
- Final review: APPROVED

### Learnings for Future Iterations
- **Mock `@/lib/api` not hooks**: The codebase convention is to mock `apiRequest` at the API layer, not mock hooks directly. Real hooks run but call mocked API.
- **DateTimePicker must be mocked in tests**: Complex component needs simple input mock for testing.
- **Sheet dialogs need state reset on reopen**: Always add useEffect to reset form state when `open` prop changes, following existing dialog patterns.
- **Side effects during render are anti-patterns**: Use useEffect for derived state updates (like pre-filling departure from arrival).
- **`CreateEventInput` requires `allDay` and `isOptional` fields**: Must explicitly set them to `false`.

---

## Iteration 2 — Task 2.1: Wire wizard into TripPreview and TripDetailContent, create TravelReminderBanner ✅

**Status**: COMPLETED

### Files Created
- `apps/web/src/components/trip/travel-reminder-banner.tsx` — Dismissible banner component with localStorage persistence and arrival detection via `useMemberTravels`
- `apps/web/src/components/trip/__tests__/travel-reminder-banner.test.tsx` — 12 unit tests

### Files Modified
- `apps/web/src/components/trip/trip-preview.tsx` — Added `onGoingSuccess?: () => void` prop, called in `handleRsvp` when `status === "going"` succeeds
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — Added `showOnboarding` state, dynamic import for `MemberOnboardingWizard`, direct import for `TravelReminderBanner`, wired `onGoingSuccess` to `TripPreview`, rendered banner between breadcrumb and hero, rendered wizard after Members Sheet
- `apps/web/src/components/trip/index.ts` — Added barrel export for `TravelReminderBanner`
- `apps/web/src/components/trip/__tests__/trip-preview.test.tsx` — Added 4 tests for `onGoingSuccess` callback behavior
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx` — Added mocks for `TravelReminderBanner` and `MemberOnboardingWizard`, updated `TripPreview` mock to capture `onGoingSuccess` prop

### What Was Implemented
- **TripPreview `onGoingSuccess` callback**: Optional prop that fires only when RSVP succeeds with `status === "going"`. Uses closure to check status inside `onSuccess` handler. Backward compatible — omitting the prop causes no issues.
- **TripDetailContent wizard integration**: `showOnboarding` state is set to `true` by `onGoingSuccess` callback from TripPreview. After `isPreview` flips to `false` (cache invalidation), the full trip view renders with wizard Sheet open. Also reopenable via banner's "Add Travel Details" button.
- **TravelReminderBanner**: Checks `useMemberTravels(tripId)` for current member's arrival entry, respects localStorage dismiss state (key: `tripful:onboarding-dismissed:${tripId}`). Uses `useEffect` for localStorage read (avoids SSR hydration mismatch). Guards against undefined `memberId` (loading state). Styled with `rounded-2xl border border-primary/20 bg-primary/[0.03] p-5` per spec.
- **Banner placement**: Between breadcrumb and hero section, gated by `trip.userRsvpStatus === "going" && !isLocked && currentMember`.
- **Dynamic import**: `MemberOnboardingWizard` uses `dynamic()` with `.then()` pattern matching existing EditTripDialog/InviteMembersDialog imports.

### Test Coverage
- **TravelReminderBanner (12 tests)**: Render conditions (no arrival, has arrival, different member's arrival, soft-deleted arrival, departure only, undefined memberId), dismiss behavior (button, X icon, localStorage persistence, pre-existing flag), `onAddTravel` callback, trip-specific localStorage keys.
- **TripPreview (4 new tests, 21 total)**: `onGoingSuccess` called for "going", not called for "maybe" or "not_going", graceful handling when prop omitted.
- **trip-detail-content.test.tsx (0 new tests, 66 passing)**: Added mocks for `TravelReminderBanner` and `MemberOnboardingWizard` to prevent `QueryClientProvider` regression.

### Verification Results
- `pnpm typecheck`: PASS (all 3 packages)
- `pnpm test` (travel-reminder-banner): PASS (12/12)
- `pnpm test` (trip-preview): PASS (21/21)
- `pnpm test` (trip-detail-content): PASS (66/66)
- `pnpm test` (all web): PASS (1063 pass, 7 pre-existing failures unrelated to this change)
- `pnpm lint`: PASS (all 3 packages)

### Reviewer Feedback & Resolution
- First review: APPROVED
- Reviewer noted two optional suggestions (non-blocking):
  1. Missing preload function for MemberOnboardingWizard (not needed since wizard opens programmatically, not via hover)
  2. Brief banner flicker while memberTravels loads (minimal due to TanStack Query caching)

### Fix Applied During Implementation
- **Regression fix**: Adding `TravelReminderBanner` (which uses `useMemberTravels` → `useQuery`) to `trip-detail-content.tsx` broke 47/66 existing tests because the test file lacked a `QueryClientProvider`. Fixed by adding component mocks for `TravelReminderBanner` and `MemberOnboardingWizard` in the test file, following the existing pattern of mocking child components as simple divs with data-testid attributes.

### Learnings for Future Iterations
- **When adding a component that uses TanStack Query hooks to an existing component, check if the existing tests mock it or provide QueryClientProvider**. The trip-detail-content tests mock all child components as simple divs — any new child component with hooks needs a mock too.
- **localStorage + SSR**: Always use `useEffect` to read localStorage to avoid hydration mismatches. Initialize state as `false` and update after mount.
- **Dynamic vs direct imports**: Use `dynamic()` for heavy components (wizard, dialogs) and direct imports for lightweight above-the-fold components (banner).
