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
