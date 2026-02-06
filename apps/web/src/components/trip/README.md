# Trip Components

This directory contains components related to trip display and management.

## TripCard

A card component for displaying trip summaries in list views (e.g., dashboard).

### Usage

```tsx
import { TripCard } from "@/components/trip";

function TripList({ trips }: { trips: TripSummary[] }) {
  return (
    <div className="space-y-4">
      {trips.map((trip, index) => (
        <TripCard key={trip.id} trip={trip} index={index} />
      ))}
    </div>
  );
}
```

### Props

- `trip`: Trip summary object with the following structure:
  ```typescript
  {
    id: string;
    name: string;
    destination: string;
    startDate: string | null;          // ISO date string (YYYY-MM-DD)
    endDate: string | null;            // ISO date string (YYYY-MM-DD)
    coverImageUrl: string | null;
    isOrganizer: boolean;
    rsvpStatus: "going" | "not_going" | "maybe" | "no_response";
    organizerInfo: Array<{
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    }>;
    memberCount: number;
    eventCount: number;
  }
  ```
- `index` (optional): Zero-based index for staggered animation delay (100ms per index)

### Features

- **Cover Image**: Displays trip cover image with gradient overlay, or gradient placeholder if null
- **Badges**:
  - "Organizing" badge shown for trips where user is organizer
  - RSVP status badge with color coding (going=emerald, maybe=amber, not_going=slate)
- **Date Display**: Formatted date range with special handling:
  - "Dates TBD" when no dates set
  - "Starts [date]" when only start date
  - "Ends [date]" when only end date
  - "Month DD - DD, YYYY" for same-month trips
  - "Month DD - Month DD, YYYY" for cross-month trips
- **Organizer Avatars**: Stacked avatars (max 3) with white ring borders, initials shown for missing photos
- **Event Count**: Shows count or "No events yet"
- **Navigation**: Entire card is clickable, navigates to `/trips/{id}`
- **Animations**: Fade-in and slide-up with staggered delay based on index
- **Accessibility**: Keyboard navigable (Enter/Space), proper ARIA roles

### Styling

The component uses Tailwind CSS with the following key styles:
- Rounded corners (`rounded-2xl`)
- Hover shadow effect
- Active scale-down effect (`active:scale-[0.98]`)
- Playfair Display font for trip names (inline style)

### Testing

Comprehensive test suite covers:
- All prop combinations
- Edge cases (missing data, null values)
- RSVP badge variants
- Date formatting scenarios
- Organizer avatar display (with/without photos)
- Navigation interactions
- Keyboard accessibility
- Animation delays

Run tests: `pnpm test trip-card`
