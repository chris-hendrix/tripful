---
date: 2026-02-01
topic: Tripful - UI/UX Design Documentation
last_updated: 2026-02-07
---

# Tripful - Design System & Page Overview

## Design Philosophy

**Vintage Travel Poster (Vivid Capri)** - Inspired by classic Italian travel posters (Capri by Mario Puppo), the design uses a warm, vivid Mediterranean palette with classic serif typography. The CSS variable system supports future theme variants (Alpine, Tropical, Nordic), but only the default Mediterranean theme is implemented.

### Core Principles

- **Clarity First**: Information hierarchy that makes complex itineraries scannable
- **Touch-Optimized**: Mobile-first with large touch targets (min 44px)
- **Delightful Motion**: Subtle animations that guide attention without distraction
- **Editorial Typography**: Playfair Display headlines with DM Sans body
- **Warm Mediterranean Palette**: Warm cream backgrounds, azure blue primary, terracotta accents

### Visual Language

- **Color Palette** (Vivid Capri - defined as CSS custom properties via Tailwind v4 `@theme`):
  - Primary: Azure blue (`#1A5F9E`) for actions, links, branding
  - Accent: Terracotta (`#D4603A`) for secondary CTAs
  - Gradient: Primary-to-accent gradient for key CTAs (`variant="gradient"`)
  - Background: Warm cream (`#FAF5EE`)
  - Foreground: Dark warm brown (`#3A2E22`)
  - Card surfaces: White (`#FFFFFF`)
  - Muted: Warm gray (`#F0EBE3`) backgrounds, sandy gray (`#8C8274`) text
  - Borders: Warm (`#E5DDD2`)
  - Success: Olive green (`#4A7C59`) for Going badges
  - Warning: Warm amber (`#C48A2A`) for Maybe badges
  - Destructive: Coral red (`#C4382A`)
  - Event Types: Blue (travel), Purple (accommodation), Amber (meals), Emerald (activities)

- **Typography**:
  - Headlines: Playfair Display (serif) via `next/font/google`
  - Body: DM Sans via `next/font/google` (set as `--font-sans` in `@theme`)
  - Page titles: `text-4xl font-bold font-[family-name:var(--font-playfair)]`
  - Card titles: `text-xl font-semibold font-[family-name:var(--font-playfair)]`
  - Body: `text-base` (DM Sans default)
  - Captions: `text-sm text-muted-foreground`

- **Spacing**:
  - Base unit: 4px (Tailwind scale)
  - Card padding: 16-24px
  - Section spacing: 32-48px

- **Borders & Shadows**:
  - Subtle borders: 1px `border-border` (warm `#E5DDD2`)
  - Elevation: Soft shadows with colored tints (`shadow-primary/25`)
  - Border radius: 12-24px for cards, 999px for pills

> **Important (Tailwind v4)**: All colors in `@theme` blocks must use **hex values**, not `hsl()`. Tailwind v4 strips the `hsl()` wrapper, leaving raw channel values that are invalid CSS. See `apps/web/src/app/globals.css`.

---

## Page Inventory

### 1. Landing Page (`/`)

**Purpose**: Branded landing page for unauthenticated users

**Layout**:

```
┌─────────────────────────────────────┐
│                                     │
│     [Warm cream background]         │
│     [Gradient overlay]              │
│                                     │
│         ✦ Tripful                   │
│   Plan and share your adventures    │
│                                     │
│       [Get Started →]               │
│                                     │
└─────────────────────────────────────┘
```

**Components**:

- **Background**: Warm cream (`bg-background`) with gradient overlays using `from-primary/5` and `from-accent/5`
- **Wordmark**: Playfair Display, large serif headline
- **Tagline**: "Plan and share your adventures" in `text-muted-foreground`
- **CTA**: `<Button variant="gradient">` linking to `/login`

**Interactions**:

- Staggered fade-in animations (wordmark → tagline → CTA)
- Authenticated users redirect to `/dashboard`

---

### 2. Authentication (`/login`, `/verify`, `/complete-profile`)

**Purpose**: Phone verification flow (3 pages)

**Layout**:

```
┌─────────────────────────────────────┐
│                                     │
│     [Warm cream background]         │
│     [Compass rose SVG pattern]      │
│                                     │
│         ✦ Tripful                   │
│                                     │
│ ┌─────────────────────────────┐    │
│ │  Get started                │    │
│ │                             │    │
│ │  Phone number               │    │
│ │  [+1 (555) 123-4567]        │    │
│ │                             │    │
│ │  [Continue →]               │    │
│ └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Design Details**:

**Background**:

- Warm cream background (`bg-background`)
- Subtle geometric map/compass pattern (SVG)
- No dark gradients or animated orbs

**Card**:

- White `bg-card` rounded-2xl with `shadow-sm` and `border-border`
- Padding: 24-32px (responsive)
- Centered in viewport with Tripful wordmark above

**Step 1 - Phone Entry** (`/login`):

- Heading: `<h1>` "Get started" (proper heading hierarchy)
- Phone input: `autocomplete="tel"`, design token colors
- Button: `variant="gradient"` (primary → accent gradient)
- Helper: SMS disclaimer in `text-muted-foreground`

**Step 2 - Verification** (`/verify`):

- Heading: `<h1>` "Verify your number"
- Code input: Centered, 2xl, monospace, tracking-widest
- Primary: `variant="gradient"` "Verify & Continue"
- Secondary: outline "Change number"

**Step 3 - Complete Profile** (`/complete-profile`):

- Heading: `<h1>` "Complete your profile"
- Display name input: `autocomplete="name"`, `aria-required="true"`
- Timezone selector

**Transitions**:

- Smooth fade between pages
- Slide-in animation from bottom
- Staggered delays (branding → form)

---

### 3. Dashboard (`/dashboard`)

**Purpose**: Mobile-first trip list with search

**Layout**:

```
┌─────────────────────────────────────┐
│ My Trips              [👤]          │
│ 3 upcoming                          │
│ [Search trips...]                   │
├─────────────────────────────────────┤
│                                     │
│ Upcoming trips                      │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [Cover Image]               │    │
│ │ [Organizing] [Going]        │    │
│ ├─────────────────────────────┤    │
│ │ Bachelor Party Weekend      │    │
│ │ 📍 Miami Beach, FL          │    │
│ │ 📅 Oct 12-14 · 15 events    │    │
│ │ [Mike +0] ──────── 📋 15    │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [Another trip...]           │    │
│ └─────────────────────────────┘    │
│                                     │
│ Past trips                          │
│ ┌─────────────────────────────┐    │
│ │ [Thumbnail] Vegas...        │    │
│ └─────────────────────────────┘    │
│                                     │
│                          [+ FAB]    │
├─────────────────────────────────────┤
│ [Trips] [Search] [Alerts] [Profile] │
└─────────────────────────────────────┘
```

**Components**:

**App Header** (sticky, via `app-header.tsx`):

- Tripful wordmark (Playfair Display) linking to `/dashboard`
- "Dashboard" nav link with active state based on `usePathname()`
- User avatar dropdown (DropdownMenu): Profile, Log out
- Uses `useAuth()` hook for user data

**Page Header**:

- Title: "My Trips" (Playfair Display `text-4xl font-bold`)
- Subtitle: Trip count in `text-muted-foreground`
- Search: Full-width with icon, `bg-muted` background

**Trip Cards** (responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`):

- Cover image: 192px height with gradient overlay
- Badges: Overlay top-left with dark frosted glass (`bg-black/50 backdrop-blur-md`)
  - Organizing: white text
  - Going: `text-emerald-300`
  - Maybe: `text-amber-300`
  - Not going: `text-neutral-300`
- Wrapped in Next.js `<Link>` (native keyboard + middle-click support)
- Content: 16px padding, design token colors
  - Title: lg semibold Playfair Display
  - Location: `MapPin` icon + `text-muted-foreground`
  - Dates: `Calendar` icon + range
  - Footer: Organizer avatars (stacked) + event count
- States: `active:scale-[0.98]`, `hover:shadow-md`
- Animation: Staggered `fade-in slide-in-from-bottom-4` (100ms delays)
- Loading: Skeleton components

**FAB** (Floating Action Button):

- Position: fixed bottom-8 right-8
- `<Button variant="gradient" size="icon">` (56×56px)
- Icon: Plus
- Shadow: `shadow-primary/25`

---

### 4. Create Trip (`/create-trip`)

**Purpose**: Multi-step form with live preview

**Layout**:

```
┌─────────────────────────────────────┐
│ ← Create Trip                       │
├─────────────────────────────────────┤
│                                     │
│ [Form sections...]                  │
│                                     │
│ Trip Name                           │
│ [Bachelor Party Weekend]            │
│                                     │
│ Destination                         │
│ [Miami Beach, FL]                   │
│                                     │
│ Dates (optional)                    │
│ [Oct 12] – [Oct 14, 2026]           │
│                                     │
│ Preferred Timezone                  │
│ [Eastern Time (ET)]                 │
│                                     │
│ Description                         │
│ [Multi-line textarea...]            │
│                                     │
│ Cover Image                         │
│ [Upload or URL]                     │
│                                     │
│ [Create Trip]                       │
│                                     │
└─────────────────────────────────────┘
```

**Form Fields**:

- **Trip Name**: Required, 3-100 chars, large input
- **Destination**: Required, with location icon
- **Dates**: Optional date range picker
- **Preferred Timezone**: Dropdown, defaults to user timezone
- **Description**: Textarea, 2000 char limit, preserves line breaks
- **Cover Image**: File upload (5MB max) or URL input

**Validation**:

- Real-time validation on blur
- Error states: Red border + error message
- Success: Green checkmark

**Preview** (desktop):

- Split screen: Form left, preview right
- Live updates as user types
- Shows how trip will appear to invitees

---

### 5. Trip Preview (`/preview`)

**Purpose**: Public trip view before RSVP (partial preview)

**Layout**:

```
┌─────────────────────────────────────┐
│                                     │
│         [Cover Image]               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Bachelor Party Weekend              │
│ 📍 Miami Beach, FL                  │
│ 📅 Oct 12-14, 2026                  │
│                                     │
│ [Trip description with              │
│  preserved line breaks...]          │
│                                     │
│ Organized by                        │
│ [👤 Mike Johnson]                   │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Will you be attending?      │    │
│ │                             │    │
│ │ [Going] [Maybe] [Not Going] │    │
│ └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Sections**:

**Hero**:

- Cover image: Full-width, 320px height
- Gradient overlay: bottom fade to white

**Trip Info**:

- Title: 3xl Playfair Display
- Location: Icon + text
- Dates: Icon + range (in trip timezone)
- Description: Prose format, line breaks preserved

**Organizer**:

- Avatar + name
- Multiple organizers: Stacked avatars with "+N"

**RSVP Card**:

- White card with border
- Question: "Will you be attending?"
- Buttons: 3-up grid
  - Going: Emerald
  - Maybe: Amber
  - Not Going: Outline
- Large touch targets (min h-12)

**Hidden** (until RSVP "Going"):

- Itinerary events
- Member list
- Event details

---

### 6. Itinerary View (`/itinerary`)

**Purpose**: Core feature - day-by-day timeline with location grouping

**Layout**:

```
┌─────────────────────────────────────┐
│ [🔷] Bachelor Party Weekend    [⋮]  │
│ [Day by day] [By type] [Trip time] [My time] │
│ Showing times in Eastern Time (ET)  │
├─────────────────────────────────────┤
│                                     │
│ 📍 Miami Beach, FL                  │
│ 📅 Oct 12-14, 2026 · 11 events      │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ [13] Tuesday, October 13     │   │
│ │ TUE                          │   │
│ │                              │   │
│ │ [5 events] [📍 Miami Beach]  │   │
│ │            [📍 Key West]     │   │
│ │            [📍 Miami → Key...]│  │
│ └──────────────────────────────┘   │
│                                     │
│ │ Timeline                          │
│ ●─────────────────────              │
│ │ 10:30 AM  ✈️ Flight to Miami    │
│ │           JFK → MIA             │
│ │           [Mike Johnson]        │
│ │                                 │
│ ● 3:00 PM   🏨 Hotel Check-in     │
│ │           [Details...]          │
│ │                                 │
│ ● 7:30 PM   🍽️ Dinner             │
│   │         [Optional]            │
│   │                               │
│   └───────────────────            │
│                                   │
│                        [+ FAB]    │
└───────────────────────────────────┘
```

**Header** (sticky):

- Logo + Trip name (2xl Playfair)
- Settings button (dots menu)

**Controls** (responsive):

- **Desktop**: Horizontal row
  - Toggles left: [Day by day | By type] [Trip time | My time]
  - Timezone text right: "Showing times in..."
- **Mobile**: Stacked
  - Toggles on first row
  - Timezone text below

**Trip Meta**:

- Location, dates, event count
- Responsive: Horizontal row (sm+), stacked (mobile)
- Separator dots between items (hidden mobile)

**Date Header**:

- Date badge: 64×64px, blue gradient, rounded-2xl
  - Number: 2xl bold
  - Day: xs uppercase
- Title: 2xl semibold, full date string
- Event count + location chips:
  - Event count chip: [📋 5 events] (slate-100)
  - Location chips: [📍 Miami Beach] [📍 Key West] (slate-100)
  - All chips: rounded-full, xs text, inline icons
  - Horizontal flow with wrapping

**Event Sorting**:

- All-day events always appear first
- Timed events sorted by start time
- Within same time, maintain creation order

**Timeline**:

- Left border: 2px slate-200
- Left padding:
  - Mobile: 40px (ml-4 pl-6)
  - Desktop: 48px (sm:ml-6 sm:pl-6)
- Spacing: 16px between events (space-y-4)

**Timeline Dots**:

- Position:
  - Mobile: absolute -left-[29px]
  - Desktop: sm:-left-[33px]
- Size: 12×12px
- White with 2px blue-500 border
- Hover: scale-150

**Event Cards**:

- White background, rounded-xl
- Border: 1px slate-200
- Padding: 16px
- Hover: shadow-md
- Click: Expand for details

**Event Card Structure**:

- Gap between sections: 8px mobile (gap-2), 12px desktop (sm:gap-3)
- **Time** (right-aligned, min-w-[70px]):
  - All day: Badge "All day" (slate-600)
  - Time range: Stacked vertically
    ```
    11:00 AM
    3:00 PM
    ```
  - Single time: Just start time
- **Content** (flex-1):
  - Badges row: Type (colored) + Multi-day (if applicable) + Optional (if applicable)
  - Title: base semibold
  - Location: xs with icon (if provided)
  - Meetup info: xs blue-700 with group icon (if provided)
    - Format: "Meetup: [time] • [location]"
    - Shows time and/or location if either is set
- **Expand icon**: Chevron, rotates 180° when expanded

**Expanded Event**:

- Border-top: slate-100
- Padding-top: 16px
- Description: Prose format
- Meetup info box: Blue-50 bg with blue-200 border (if meetup location/time set)
  - Group icon with "Meetup" label
  - Shows time and location with formatting
- Links: Clickable with external icon
- Footer: Creator avatar (6×6) + edit button

**Event Type Colors**:

- Travel: Blue (✈️)
- Meal: Amber (🍽️)
- Activity: Emerald (🎉)

**Note**: Accommodation (🏨 Purple) is a separate entity type with its own form, not an event type.

**FAB**:

- Position: fixed bottom-8 right-8
- Size: 64×64px
- Gradient: blue-600 → cyan-600
- Icon: Plus, rotates 90° on hover
- Shadow: 2xl with blue-500/40

**Location Change Design**:

- Travel events with arrow notation (e.g., "Miami → Key West")
- Appear in location chips at day level
- Show transitions between cities in timeline

**Multi-Day Events**:

- Events with end dates (e.g., accommodation Oct 12-15)
- Appear once on the start date with a "Multi-day" badge showing the date range
- Do NOT duplicate across each day
- Typically all-day events (especially accommodation)

---

### 7. Create Event (`/create-event`)

**Purpose**: Add itinerary events (group activities, meals, travel)

**Layout**:

```
┌─────────────────────────────────────┐
│ ← Add Event                         │
├─────────────────────────────────────┤
│                                     │
│ Event Type *                        │
│ [✈️ Travel] [🍽️ Meal]               │
│ [🎉 Activity]               │
│                                     │
│ Event Name *                        │
│ [Drive to Key West]                 │
│ 3/200 characters                    │
│                                     │
│ Date *                              │
│ [Oct 12, 2026]                      │
│ [+ Add end date (for multi-day)]    │
│                                     │
│ Time                                │
│ [10:30 AM] - [2:00 PM]              │
│ Start time   End time (optional)    │
│ ☐ All day                           │
│                                     │
│ Location (optional)                 │
│ [Miami → Key West]                  │
│ 💡 Use → to show route             │
│                                     │
│ Meetup Location (optional)          │
│ [Hotel lobby]                       │
│ Where the group will meet           │
│                                     │
│ Meetup Time (optional)              │
│ [10:30 AM]                          │
│ When to meet                        │
│                                     │
│ Description (optional)              │
│ [Add details, confirmation...]      │
│                                     │
│ Links (optional)                    │
│ [https://example.com]               │
│ [+ Add another link]                │
│                                     │
│ ☐ Optional event                    │
│   Members can choose to attend      │
│                                     │
│ [Cancel] [Add Event]                │
│                                     │
└─────────────────────────────────────┘
```

**Form Sections**:

**Event Type** (required):

- 3 types only: Travel, Meal, Activity
  - Travel: Group transportation (drives, ferries, etc.)
  - Meal: Dining reservations, group meals
  - Activity: Tours, excursions, activities
- 3-column grid layout
- Large touch targets (min h-20)
- Radio button behavior
- Selected state: Colored background matching event type
  - Travel: bg-blue-100 border-blue-300
  - Meal: bg-amber-100 border-amber-300
  - Activity: bg-emerald-100 border-emerald-300
- Unselected: bg-white border-slate-200
- Emoji icon + label stacked
- Smooth color transition (200ms)

**Note**: Accommodation and individual member arrivals/departures use separate dedicated forms

**Event Name** (required):

- Large input (h-12)
- Placeholder: Based on event type
  - Travel: "e.g., Flight to Miami"
  - Meal: "e.g., Dinner at Joe's"
  - Activity: "e.g., Boat tour"
- Character count: 3-200 chars
- Validation: Real-time on blur

**Date** (required):

- Start date picker: Native or custom with calendar popup
- Full-width input
- "Add end date" button below for multi-day events (activities)
- When end date added:
  - Second date picker appears
  - "Remove end date" link to cancel
  - End date must be >= start date
  - Multi-day events appear once on the start date with a "Multi-day" badge

**Time** (optional):

- Two-column layout: [Start time] — [End time]
- Helper labels below each: "Start time" and "End time (optional)"
- Layout:
  - Desktop: Side by side with dash separator
  - Mobile: Side by side (slightly smaller)
- Time pickers: Native time input or dropdown
- Start time: Required if not "All day"
- End time: Optional, for time ranges
- All day: Checkbox below time inputs, disables both time pickers when checked

**Location** (optional):

- Text input with location icon
- Helper text for travel events: "💡 For travel, use → to show route (e.g., JFK → MIA)"
- Max 500 chars
- Placeholder changes by type:
  - Travel: "JFK → MIA"
  - Meal: "Restaurant name and address"
  - Activity: "Venue or meeting point"

**Meetup Location** (optional):

- Text input
- Max 200 chars
- Placeholder: "e.g., Hotel lobby, Coffee shop at 123 Main St"
- Helper text: "Where the group will meet before the event"

**Meetup Time** (optional):

- Time input
- Helper text: "When to meet (can be before the event start time)"
- Displayed in blue info box in itinerary expanded view

**Description** (optional):

- Textarea, 4 rows min
- Auto-expand as user types
- Max 2000 chars
- Character counter (shows at 1800+)
- Preserves line breaks
- Placeholder: "Add details, confirmation numbers, special instructions..."

**Links** (optional):

- URL input with globe icon
- "Add another link" button (max 10)
- Each link can be removed with × button
- Validation: Must be valid HTTP/HTTPS URL
- Display as: [Icon] [Input] [× Remove]

**Optional Event**:

- Checkbox with label: "Optional event"
- Helper text: "Members can choose whether to attend"
- All events are visible to all accepted members

**Form Actions**:

- Cancel: Outline button, left-aligned
- Add Event: Primary gradient button, right-aligned
- Both buttons: min h-12, mobile full-width stacked
- Desktop: Horizontal row with justify-between

**Design Details**:

**Header** (sticky on scroll):

- Back arrow + "Add Event" title
- Saves scroll position when switching between fields

**Field Labels**:

- Semibold, slate-700
- Required fields marked with red asterisk (\*)
- Optional fields: "(optional)" in slate-500

**Validation States**:

- Error: Red border (border-red-300) + error message below
- Success: Green checkmark icon in input
- Focus: Blue ring (ring-2 ring-blue-500)

**Helper Text**:

- Small text (xs) below inputs
- Slate-500 for hints
- Red-600 for errors

**Interactions**:

- Auto-focus on Event Name after type selected
- Enter key: Move to next field (not submit)
- Tab navigation follows logical order
- Smooth transitions between validation states (200ms)

**Mobile Optimizations**:

- Full-screen view
- Larger inputs (h-12)
- Sticky footer with action buttons
- Event type grid: 2×2 with adequate spacing
- No floating labels (labels stay on top)

**Success State**:

- After adding event: Toast notification "✓ Event added"
- Returns to itinerary view
- Smooth page transition
- New event highlighted briefly (pulse animation)

---

## Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm-lg)
- **Desktop**: > 1024px (lg+)

### Mobile Adaptations:

- Single column layouts
- Stacked controls and chips
- Larger touch targets (min 44px)
- Bottom navigation instead of sidebar
- Simplified cards (less information density)

### Tablet Adaptations:

- 2-column grids
- Horizontal layouts for meta information
- Progressive disclosure (collapsed by default)

### Desktop Enhancements:

- Side-by-side layouts (form + preview)
- Hover states and tooltips
- Keyboard navigation
- Multi-column grids (3-up)

---

## Animation Patterns

### Entry Animations:

```css
.animate-in {
  animation: fadeInSlide 0.7s ease-out;
}

@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Usage**:

- Stagger delays: 100ms increments
- Page content: 700ms duration
- Cards: 500ms duration
- Chips/badges: 300ms duration

### Interaction Animations:

- **Hover**: 200ms ease
  - Shadows: From sm to xl
  - Translations: 1-4px
- **Active/Pressed**:
  - Scale: 0.95-0.98
  - Duration: 100ms
- **State Changes**:
  - Fade: 300ms
  - Slide: 200ms

### Loading States:

- Pulse animation for gradient orbs
- Skeleton screens (not implemented in demo)
- Spinner: Rotating gradient ring

---

## Accessibility

### Semantic HTML:

- Proper heading hierarchy (`<h1>` on each page, `<h2>` → `<h3>` within)
- Landmark regions: `<header>` (app header), `<nav aria-label="Main navigation">`, `<main id="main-content">`
- Button vs link distinction (TripCard uses `<Link>`, not `<div role="button">`)
- `autocomplete` attributes on form inputs (`tel`, `name`)
- `aria-required="true"` on required fields
- `aria-live="polite"` on dynamic content (search results)

### Keyboard Navigation:

- **Skip link** (`skip-link.tsx`): First focusable element, jumps to `#main-content`
- Focusable interactive elements
- Focus visible states (`focus-visible:border-ring focus-visible:ring-ring`)
- Tab order follows visual order

### Color Contrast:

- Text: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Image overlay badges use dark frosted glass (`bg-black/50`) for contrast
- Interactive elements: Clear visual states

### Touch Targets:

- Minimum 44×44px for all interactive elements
- Icon-only buttons sized with adequate padding
- Co-organizer remove buttons sized to meet minimum

### Screen Readers:

- Alt text for images
- ARIA labels where needed
- Hidden helper text for context

---

## Component Patterns

### Badges:

```tsx
// RSVP status (on image overlays — dark frosted glass)
<Badge className="bg-black/50 backdrop-blur-md text-emerald-300 border-white/20 shadow-sm">
  Going
</Badge>

// RSVP status (on card surfaces — semantic tokens)
<Badge className="bg-success/15 text-success border-success/30">
  Going
</Badge>

// Event type
<Badge className="bg-blue-100 text-blue-700 border-blue-200">
  ✈️ Travel
</Badge>

// Optional
<Badge variant="outline" className="text-muted-foreground border-input">
  Optional
</Badge>
```

### Chips (Location/Count):

```tsx
<div className="inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-xs font-medium text-foreground">
  <svg>...</svg>
  <span>Miami Beach</span>
</div>
```

### Cards:

```tsx
<div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-6">
  {/* Content */}
</div>
```

### Buttons:

```tsx
// Primary gradient (primary → accent)
<Button variant="gradient">
  Continue
</Button>

// Secondary
<Button variant="outline">
  Cancel
</Button>
```

### Toast Notifications:

```tsx
import { toast } from "sonner";

// Success
toast.success("Trip created successfully");

// Error
toast.error("Failed to update trip");
```

---

## Design Tokens

All colors are defined as CSS custom properties in `apps/web/src/app/globals.css` via Tailwind v4 `@theme`. Use **hex values only** (never `hsl()`) due to Tailwind v4 stripping the wrapper.

### Colors (Vivid Capri Palette):

```css
/* Core */
--color-primary: #1a5f9e; /* Azure blue */
--color-accent: #d4603a; /* Terracotta */
--color-background: #faf5ee; /* Warm cream */
--color-foreground: #3a2e22; /* Dark warm brown */
--color-card: #ffffff;
--color-muted: #f0ebe3; /* Warm gray */
--color-muted-foreground: #8c8274; /* Sandy gray */
--color-border: #e5ddd2; /* Warm border */
--color-destructive: #c4382a; /* Coral red */

/* Semantic */
--color-success: #4a7c59; /* Olive green (Going) */
--color-warning: #c48a2a; /* Warm amber (Maybe) */
```

### Usage Patterns:

```js
// Gradient button (uses Button variant="gradient")
gradient: 'bg-gradient-to-r from-primary to-accent text-white'

// Backgrounds
page: 'bg-background'        // Warm cream
card: 'bg-card'               // White

// Text
primary: 'text-foreground'    // Dark warm brown
secondary: 'text-muted-foreground' // Sandy gray

// Event types (unchanged)
eventTypes: {
  travel: 'bg-blue-100 text-blue-700 border-blue-200',
  accommodation: 'bg-purple-100 text-purple-700 border-purple-200',
  meal: 'bg-amber-100 text-amber-700 border-amber-200',
  activity: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

// RSVP badges (on image overlays — frosted glass)
rsvp: {
  going: 'bg-black/50 backdrop-blur-md text-emerald-300',
  maybe: 'bg-black/50 backdrop-blur-md text-amber-300',
  notGoing: 'bg-black/50 backdrop-blur-md text-neutral-300',
}
```

### Spacing Scale:

- xs: 8px (2 units)
- sm: 12px (3 units)
- base: 16px (4 units)
- lg: 24px (6 units)
- xl: 32px (8 units)
- 2xl: 48px (12 units)

### Border Radius:

- sm: 8px
- base: 12px
- lg: 16px
- xl: 24px
- full: 9999px (pills/circles)

---

## Next Steps

### Completed:

- ✅ Create event page
- ✅ Frontend design overhaul (Vivid Capri palette, app shell, accessibility)

### MVP Phase 2:

- Edit event page
- Group by type view
- Member list UI
- Trip settings page
- Notification center

### Future Enhancements:

- Dark mode support (CSS variable system is ready for it)
- Additional travel-poster themes (Alpine, Tropical, Nordic)
- Advanced animations (page transitions)
- Map integration
- Rich text editor
- Photo uploads
- Real-time collaboration indicators

---

## File References

- Design tokens: `apps/web/src/app/globals.css`
- Fonts: `apps/web/src/lib/fonts.ts`
- App shell: `apps/web/src/components/app-header.tsx`
- Skip link: `apps/web/src/components/skip-link.tsx`
- UI components: `apps/web/src/components/ui/`
- Trip components: `apps/web/src/components/trip/`
- Pages: `apps/web/src/app/*/page.tsx`
- Design overhaul architecture: `.ralph/ARCHITECTURE.md`
- PRD: `docs/2026-02-01-tripful-mvp/PRD.md`
