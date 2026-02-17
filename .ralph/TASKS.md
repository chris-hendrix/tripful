# Post-RSVP Onboarding Wizard - Tasks

## Phase 1: Wizard Component

- [x] Task 1.1: Create MemberOnboardingWizard with all steps (Arrival, Departure, Events, Done)
  - Implement: Create `apps/web/src/components/trip/member-onboarding-wizard.tsx` with Sheet wrapper
  - Implement: Props: `open`, `onOpenChange`, `tripId`, `trip` (TripDetailWithMeta)
  - Implement: Internal state: `step` (number), `arrivalLocation`, `arrivalTime`, `departureTime`, `addedEvents[]`
  - Implement: Compute `canAddEvents` from `trip.isOrganizer || trip.allowMembersToAddEvents` and `totalSteps`
  - Implement: Progress dots in SheetHeader (filled for current/completed, muted for future, "Step X of Y" text)
  - Implement: Step 0 (Arrival): heading "When are you arriving?", DateTimePicker + Input (location), pre-populate date with `trip.startDate`, auto-detect timezone, "Next" calls `useCreateMemberTravel({ travelType: "arrival", time, location })`, stores location for departure pre-fill
  - Implement: Step 1 (Departure): heading "When are you leaving?", DateTimePicker + Input (location), pre-populate date with `trip.endDate`, pre-fill location from arrival, "Next" calls `useCreateMemberTravel({ travelType: "departure", time, location })`
  - Implement: Step 2 (Events, conditional): heading "Want to suggest any activities?", quick-add form (name Input + DateTimePicker), "Add" button calls `useCreateEvent()` per event, shows added events as chips, "Next" advances without additional save
  - Implement: Done step: heading "You're all set!", summary of saved items (arrival time, departure time, event count), "View Itinerary" button closes wizard
  - Implement: Navigation footer per step: Back (not on step 0), Skip (ghost variant), Next (gradient variant, loading state while mutation pending)
  - Implement: SheetTitle uses Playfair font per existing pattern, match existing Sheet dialog styling
  - Test: Write unit tests in `apps/web/src/components/trip/__tests__/member-onboarding-wizard.test.tsx` covering: step navigation forward/back, skip behavior, arrival form submission calls useCreateMemberTravel, departure pre-fills from arrival location, events step conditionally rendered, done summary reflects saved data
  - Verify: `pnpm typecheck` — no errors
  - Verify: `pnpm test` — all tests pass

## Phase 2: Integration & Reminder Banner

- [x] Task 2.1: Wire wizard into TripPreview and TripDetailContent, create TravelReminderBanner
  - Implement: In `apps/web/src/components/trip/trip-preview.tsx`, add `onGoingSuccess?: () => void` to TripPreviewProps, call `onGoingSuccess?.()` in handleRsvp onSuccess when `status === "going"`
  - Implement: In `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`, add `showOnboarding` state, `dynamic()` import for MemberOnboardingWizard, pass `onGoingSuccess` to TripPreview, render wizard after Members Sheet
  - Implement: Create `apps/web/src/components/trip/travel-reminder-banner.tsx` with props `tripId`, `memberId`, `onAddTravel`
  - Implement: Banner uses `useMemberTravels(tripId)` to check for arrival entry, `localStorage` for dismiss state
  - Implement: Banner renders info card with "Add Travel Details" and "Dismiss" buttons, styled with `rounded-2xl border border-primary/20 bg-primary/[0.03] p-5`
  - Implement: In trip-detail-content.tsx, render TravelReminderBanner between breadcrumb and hero when `trip.userRsvpStatus === "going" && !isLocked`, `onAddTravel` reopens wizard
  - Test: Write unit tests in `apps/web/src/components/trip/__tests__/travel-reminder-banner.test.tsx` covering: renders when no arrival and not dismissed, hidden when arrival exists, hidden after dismiss, dismiss persists in localStorage, buttons fire correct callbacks
  - Test: Update `apps/web/src/components/trip/__tests__/trip-preview.test.tsx` to verify `onGoingSuccess` is called when RSVP "going" succeeds
  - Verify: `pnpm typecheck` — no errors
  - Verify: `pnpm test` — all tests pass

## Phase 3: E2E Tests

- [ ] Task 3.1: Update existing invitation E2E test and add onboarding wizard E2E test
  - Implement: In `apps/web/tests/e2e/invitation-journey.spec.ts`, update "member RSVPs Going and sees full itinerary" step: after RSVP "Going" and toast, wait for wizard Sheet heading "When are you arriving?", dismiss wizard (click close or skip through), then assert full trip view
  - Implement: Add new test "member completes onboarding wizard after RSVP" in `invitation-journey.spec.ts`: create trip with start/end dates via API, invite member, auth as member, navigate to trip, RSVP "Going", verify wizard opens, fill arrival (pick date, enter location), click Next, verify departure step, fill departure, click Next, verify events step or done step, skip events if shown, verify "You're all set!" summary, click "View Itinerary", verify full trip view, verify travel entries appear in itinerary
  - Verify: `pnpm test:e2e` — all E2E tests pass including updated invitation journey and new onboarding test

## Phase 4: Final Verification

- [ ] Task 4.1: Full regression check
  - Verify: All unit tests pass (`pnpm test`)
  - Verify: All E2E tests pass (`pnpm test:e2e`)
  - Verify: Linting passes (`pnpm lint`)
  - Verify: Type checking passes (`pnpm typecheck`)
