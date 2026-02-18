# Post-RSVP Onboarding Wizard - Architecture

A multi-step Sheet wizard that auto-opens after a member RSVPs "Going" to guide them through entering arrival details, departure details, and optionally suggesting events. Each step saves independently. A reminder banner appears if the wizard is dismissed before entering arrival details.

## Overview

Frontend-only feature. No API or database changes needed. Uses existing mutation hooks (`useCreateMemberTravel`, `useCreateEvent`) and existing UI components (`Sheet`, `DateTimePicker`, `Input`, `Button`).

## State Management

### Challenge

After RSVP "Going", `TripPreview` unmounts and `TripDetailContent` renders the full trip view. Wizard state must survive this component transition.

### Solution

Lift wizard open state to `TripDetailContent`. Pass an `onGoingSuccess` callback to `TripPreview`. When RSVP succeeds with "going", set a flag in `TripDetailContent`. After `isPreview` flips to `false`, the wizard Sheet opens.

```tsx
// trip-detail-content.tsx
const [showOnboarding, setShowOnboarding] = useState(false);

// In preview branch (line 168):
if (trip.isPreview) {
  return (
    <TripPreview
      trip={trip}
      tripId={tripId}
      onGoingSuccess={() => setShowOnboarding(true)}
    />
  );
}

// After Members Sheet (line 470):
{showOnboarding && (
  <MemberOnboardingWizard
    open={showOnboarding}
    onOpenChange={setShowOnboarding}
    tripId={tripId}
    trip={trip}
  />
)}
```

## FE Components

### Component Tree

```
TripDetailContent (apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx)
├── TripPreview (modified: adds onGoingSuccess callback)
├── TravelReminderBanner (NEW: apps/web/src/components/trip/travel-reminder-banner.tsx)
└── MemberOnboardingWizard (NEW: apps/web/src/components/trip/member-onboarding-wizard.tsx)
    ├── Step 0: Arrival (DateTimePicker + Input)
    ├── Step 1: Departure (DateTimePicker + Input)
    ├── Step 2: Events [conditional] (Input + DateTimePicker + "Add" button)
    └── Step N-1: Done (Summary)
```

### MemberOnboardingWizard

**File**: `apps/web/src/components/trip/member-onboarding-wizard.tsx`

**Props**:
```tsx
interface MemberOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  trip: TripDetailWithMeta;
}
```

**Internal State**:
- `step: number` — current wizard step (0-indexed)
- `arrivalLocation: string` — location from step 0, used to pre-fill departure in step 1
- `arrivalTime: string` — ISO string saved on step 0, shown in done summary
- `departureTime: string` — ISO string saved on step 1, shown in done summary
- `addedEvents: Array<{ name: string; startTime: string }>` — events added in step 2, shown in done summary

**Computed Values**:
- `canAddEvents = trip.isOrganizer || trip.allowMembersToAddEvents`
- `totalSteps = canAddEvents ? 4 : 3`
- `timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || trip.preferredTimezone`

**Step Flow**:
```
Step 0: Arrival     → useCreateMemberTravel({ travelType: "arrival", time, location })
Step 1: Departure   → useCreateMemberTravel({ travelType: "departure", time, location })
Step 2: Events      → useCreateEvent({ name, eventType: "activity", startTime }) [only if canAddEvents]
Step N-1: Done      → Summary + "View Itinerary" button
```

**Navigation Pattern**:
- Each step footer: `[<- Back]` (not on step 0), `[Skip]` (variant="ghost"), `[Next ->]` (variant="gradient")
- "Next" saves data via mutation, then advances on success
- "Skip" advances without saving
- "Back" goes to previous step (already-saved data is preserved, no re-save)
- Done step: single "View Itinerary" button that calls `onOpenChange(false)`

**Date Pre-population**:
- Arrival: pre-populate with `trip.startDate` + "12:00" noon via `localPartsToUTC(trip.startDate, "12:00", timezone)` from `@/lib/utils/timezone`
- Departure: pre-populate with `trip.endDate` + "12:00" noon
- Only pre-populate the date portion if `trip.startDate`/`trip.endDate` exist

**Events Step Quick-Add**:
- Input for event name + DateTimePicker for startTime
- "Add" button calls `useCreateEvent` immediately per event
- On success: adds to local `addedEvents` array and clears the form inputs
- Shows added events as dismissible chips below form (name + formatted time + X button)
- X button only removes from the display list, does NOT delete the event via API (already saved)

**UI Patterns** (match existing Sheet dialogs):
- SheetTitle: `text-3xl font-[family-name:var(--font-playfair)] tracking-tight`
- Progress dots: horizontal row in SheetHeader, filled primary for current/completed, muted for future
- DateTimePicker: pass `timezone` prop, `value` as ISO UTC string
- Input: `h-12 text-base border-input focus-visible:border-ring focus-visible:ring-ring rounded-xl`
- Buttons: `h-12 rounded-xl`, gradient variant for primary action, ghost for skip
- Loading spinner on Next button while mutation is pending (`Loader2` icon)

### TravelReminderBanner

**File**: `apps/web/src/components/trip/travel-reminder-banner.tsx`

**Props**:
```tsx
interface TravelReminderBannerProps {
  tripId: string;
  memberId: string | undefined;
  onAddTravel: () => void;
}
```

**Logic**:
- Uses `useMemberTravels(tripId)` to check if current member has an arrival entry
- Tracks dismissed state in `localStorage` key: `tripful:onboarding-dismissed:${tripId}`
- Only renders if: member has no arrival travel entry AND banner not dismissed
- "Add Travel Details" button calls `onAddTravel` (reopens wizard)
- "Dismiss" button sets localStorage flag, re-renders to hidden

**Styling** (matches existing invitation CTA card):
```
rounded-2xl border border-primary/20 bg-primary/[0.03] p-5
```

### TripPreview Modification

**File**: `apps/web/src/components/trip/trip-preview.tsx`

- Add `onGoingSuccess?: () => void` to `TripPreviewProps` interface (line 25-28)
- In `handleRsvp` `onSuccess` (line 39-45): if `status === "going"`, call `onGoingSuccess?.()` after the toast

### TripDetailContent Modification

**File**: `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`

- Add `const [showOnboarding, setShowOnboarding] = useState(false)` near existing state (line 94-99)
- Add `dynamic()` import for `MemberOnboardingWizard` following existing pattern (line 58-74)
- Pass `onGoingSuccess={() => setShowOnboarding(true)}` to `<TripPreview>` at line 169
- Render `<TravelReminderBanner>` between breadcrumb (line 187) and hero (line 190) when `trip.userRsvpStatus === "going" && !isLocked`
- Banner's `onAddTravel` callback sets `showOnboarding` to true
- Render `<MemberOnboardingWizard>` after Members Sheet (line 470) when `showOnboarding` is true

## Existing Hooks Used

| Hook | Import From | Signature |
|------|-------------|-----------|
| `useCreateMemberTravel()` | `@/hooks/use-member-travel` | `.mutate({ tripId, data: { travelType, time, location } })` |
| `useCreateEvent()` | `@/hooks/use-events` | `.mutate({ tripId, data: { name, eventType, startTime } })` |
| `useMemberTravels(tripId)` | `@/hooks/use-member-travel` | Returns `MemberTravel[]` for the trip |
| `useMembers(tripId)` | `@/hooks/use-invitations` | Gets `currentMember` for banner's `memberId` |

## Existing UI Components Used

| Component | Import From |
|-----------|-------------|
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetBody`, `SheetTitle`, `SheetDescription`, `SheetFooter` | `@/components/ui/sheet` |
| `DateTimePicker` | `@/components/ui/datetime-picker` |
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `localPartsToUTC` | `@/lib/utils/timezone` |

## Testing Strategy

### Unit Tests (Vitest + Testing Library)
- `member-onboarding-wizard.test.tsx`: Step navigation, skip/back behavior, form submission calls correct hooks, conditional events step, done summary content
- `travel-reminder-banner.test.tsx`: Render conditions based on member travel data, dismiss sets localStorage, button callbacks

### E2E Tests (Playwright)
- Update `invitation-journey.spec.ts`: After RSVP "Going", handle wizard (dismiss or skip through) before asserting full trip view
- New E2E test: "member completes onboarding wizard after RSVP" — fill arrival, departure, verify done summary, verify travel entries in itinerary

### What Doesn't Change
- No API changes, no database changes, no new packages
- Existing `inviteAndAcceptViaAPI` helper bypasses browser RSVP, so tests using it are unaffected
- Organizer-created trips don't trigger the wizard (organizer doesn't RSVP via preview)
