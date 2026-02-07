# Phase 4: Itinerary View Modes - Verification

This document describes how to verify that Phase 4 features work correctly. Ralph will execute ALL checks listed here, including manual testing with Playwright.

---

## Prerequisites

### Environment Setup

1. **PostgreSQL running** (via Docker Compose):

   ```bash
   pnpm docker:up
   ```

   Verify: PostgreSQL accessible at `localhost:5433`

2. **Environment variables** configured:
   - `apps/api/.env` exists with valid `DATABASE_URL` and `JWT_SECRET`
   - `apps/web/.env.local` exists with valid `NEXT_PUBLIC_API_URL`

3. **Dependencies installed**:

   ```bash
   pnpm install
   ```

4. **Database migrations applied**:

   ```bash
   cd apps/api && pnpm db:migrate
   ```

5. **Playwright installed** (for E2E and manual testing):
   ```bash
   cd apps/web
   npx playwright install chromium
   ```

---

## Verification Steps

### 1. Unit Tests

Run all unit tests for services, utilities, and business logic.

```bash
cd /home/chend/git/tripful
pnpm test
```

**Expected result**: All tests pass with no failures.

**Key test files to verify**:

- `apps/api/src/services/event.service.test.ts`
- `apps/api/src/services/accommodation.service.test.ts`
- `apps/api/src/services/member-travel.service.test.ts`
- `apps/api/src/services/permissions.service.test.ts`
- `apps/web/src/lib/utils/timezone.test.ts`
- `shared/schemas/event.test.ts`
- `shared/schemas/accommodation.test.ts`
- `shared/schemas/member-travel.test.ts`

---

### 2. Integration Tests

Run integration tests that hit the API with a test database.

```bash
cd /home/chend/git/tripful
pnpm test
```

**Expected result**: All integration tests pass.

**Key test files to verify**:

- `apps/api/src/routes/event.routes.test.ts`
- `apps/api/src/routes/accommodation.routes.test.ts`
- `apps/api/src/routes/member-travel.routes.test.ts`
- Tests for POST, GET, PUT, DELETE, and restore endpoints
- Tests for permission checks (403 Forbidden for unauthorized users)
- Tests for validation errors (400 Bad Request)

---

### 3. Component Tests

Run React component tests using Vitest + React Testing Library.

```bash
cd /home/chend/git/tripful
pnpm test
```

**Expected result**: All component tests pass.

**Key test files to verify**:

- `apps/web/src/components/itinerary/itinerary-view.test.tsx`
- `apps/web/src/components/itinerary/day-by-day-view.test.tsx`
- `apps/web/src/components/itinerary/group-by-type-view.test.tsx`
- `apps/web/src/components/itinerary/event-card.test.tsx`
- `apps/web/src/components/itinerary/accommodation-card.test.tsx`
- `apps/web/src/components/itinerary/member-travel-card.test.tsx`
- `apps/web/src/components/itinerary/create-event-dialog.test.tsx`
- `apps/web/src/components/itinerary/edit-event-dialog.test.tsx`
- `apps/web/src/hooks/use-events.test.tsx`
- `apps/web/src/hooks/use-accommodations.test.tsx`
- `apps/web/src/hooks/use-member-travel.test.tsx`

---

### 4. TypeScript Type Checking

Verify no type errors across the entire codebase.

```bash
cd /home/chend/git/tripful
pnpm typecheck
```

**Expected result**: No TypeScript errors.

---

### 5. Linting

Verify code follows ESLint rules.

```bash
cd /home/chend/git/tripful
pnpm lint
```

**Expected result**: No linting errors. (Warnings are acceptable but should be minimized.)

---

### 6. E2E Tests (Automated)

Run Playwright E2E tests that simulate complete user flows.

**Start dev servers** (in separate terminal):

```bash
cd /home/chend/git/tripful
pnpm dev
```

**Run E2E tests** (in another terminal):

```bash
cd /home/chend/git/tripful
pnpm test:e2e
```

**Expected result**: All E2E tests pass.

**Key scenarios tested**:

- Organizer creates event (meal type)
- Organizer creates accommodation
- Member adds member travel (arrival)
- Toggle view mode (day-by-day ↔ group-by-type)
- Toggle timezone (trip timezone ↔ user timezone)
- Organizer soft deletes event
- Organizer restores deleted event
- Non-member cannot add event (permission check)
- Member with "not going" status cannot add event
- Responsive layout on mobile viewport

**Test file**: `apps/web/tests/e2e/itinerary-flows.spec.ts`

---

### 7. Manual Testing with Playwright (Visual Verification)

**IMPORTANT**: Ralph will perform this step automatically using Playwright. This is NOT optional user testing - it's agent-driven visual verification.

#### Setup

1. **Ensure dev servers are running**:

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

2. **Seed test data** (if not already seeded by E2E tests):
   - Create test trips with realistic data
   - Add multiple events (meals, activities, travel)
   - Add accommodations spanning multiple days
   - Add member travel (arrivals and departures)

#### Manual Test Scenarios

For each scenario below, **navigate using Playwright**, **interact with the UI**, and **capture screenshots**.

##### 7.1. Day-by-Day View (Desktop)

**Steps**:

1. Open Playwright inspector: `npx playwright test --debug`
2. Navigate to trip detail page: `/trips/{test-trip-id}`
3. Verify itinerary loads with day-by-day grouping
4. Verify each day shows:
   - Accommodation section (if applicable) in collapsed state
   - Arrivals section (if any) with member names and times
   - Departures section (if any) with member names and times
   - Event cards sorted by time (all-day events first)
5. Expand an accommodation card - verify address and description visible
6. Expand an event card - verify description, links, creator visible
7. Capture screenshot

**Screenshot**: `.ralph/screenshots/day-by-day-view-desktop.png`

**Expected result**: Itinerary displays correctly with proper grouping, times in trip timezone, Mediterranean design colors.

##### 7.2. Day-by-Day View (Mobile)

**Steps**:

1. Resize viewport to mobile (375x667)
2. Navigate to trip detail page
3. Verify responsive layout (itinerary header stacks, cards full-width)
4. Scroll through itinerary
5. Capture screenshot

**Screenshot**: `.ralph/screenshots/day-by-day-view-mobile.png`

**Expected result**: Mobile layout displays correctly, touch targets are adequate (min 44px).

##### 7.3. Group-by-Type View (Desktop)

**Steps**:

1. Navigate to trip detail page (desktop viewport)
2. Click view mode toggle to switch to "Group by type"
3. Verify events grouped into sections:
   - Accommodations
   - Travel Events
   - Meal Events
   - Activity Events
4. Verify items within each type sorted by date/time
5. Verify member travel NOT included in group-by-type view
6. Capture screenshot

**Screenshot**: `.ralph/screenshots/group-by-type-view-desktop.png`

**Expected result**: Items correctly grouped by type, no member travel visible, sorted chronologically within each type.

##### 7.4. Timezone Toggle (Before and After)

**Steps**:

1. Navigate to trip detail page
2. Verify times displayed in trip's preferred timezone (e.g., "EST")
3. Note the displayed time for one event
4. Capture screenshot (before)
5. Click timezone toggle to switch to "Show in my timezone"
6. Verify times convert to user's timezone (e.g., "PST")
7. Verify timezone indicator shows "Showing times in your timezone (PST)"
8. Capture screenshot (after)
9. Toggle back to trip timezone
10. Verify times revert to trip's timezone

**Screenshots**:

- `.ralph/screenshots/timezone-toggle-before.png`
- `.ralph/screenshots/timezone-toggle-after.png`

**Expected result**: Times convert correctly between timezones, indicator shows current timezone.

##### 7.5. Create Event Dialog

**Steps**:

1. Navigate to trip detail page (as organizer or member with going status)
2. Click "Add Event" button
3. Verify dialog opens with form fields:
   - Name (text input)
   - Description (textarea)
   - Event Type (select: travel/meal/activity)
   - Location (text input)
   - Start Time (datetime-local input)
   - End Time (datetime-local input, optional)
   - All Day (checkbox)
   - Is Optional (checkbox)
   - Links (dynamic array input)
4. Capture screenshot

**Screenshot**: `.ralph/screenshots/create-event-dialog.png`

**Expected result**: Dialog displays correctly with all fields, validation hints visible, follows Mediterranean design.

##### 7.6. Accommodation Multi-Day Display

**Steps**:

1. Navigate to trip detail page with an accommodation spanning 3+ days
2. Locate accommodation in day-by-day view (should appear on first day)
3. Verify collapsed state shows: name + multi-day indicator (e.g., "3 nights")
4. Capture screenshot (collapsed)
5. Click to expand accommodation card
6. Verify expanded state shows: address, description, check-in/check-out dates, links
7. Capture screenshot (expanded)

**Screenshots**:

- `.ralph/screenshots/accommodation-collapsed.png`
- `.ralph/screenshots/accommodation-expanded.png`

**Expected result**: Multi-day accommodation displays correctly in collapsed and expanded states, check-in/check-out dates visible.

##### 7.7. Member Travel Arrivals

**Steps**:

1. Navigate to trip detail page with 3+ member arrivals on same day
2. Locate arrivals section for that day
3. Verify each arrival shows: icon, member name, time, location
4. Verify compact single-line display
5. Capture screenshot

**Screenshot**: `.ralph/screenshots/member-travel-arrivals.png`

**Expected result**: Arrivals display compactly, all member names and times visible.

##### 7.8. Member Travel Departures

**Steps**:

1. Navigate to trip detail page with 3+ member departures on same day
2. Locate departures section for that day
3. Verify each departure shows: icon, member name, time, location
4. Capture screenshot

**Screenshot**: `.ralph/screenshots/member-travel-departures.png`

**Expected result**: Departures display compactly, differentiated from arrivals (different icon/color).

##### 7.9. Edit Event Dialog

**Steps**:

1. Navigate to trip detail page
2. Click edit button on an existing event (as creator or organizer)
3. Verify dialog opens with form pre-filled with event data
4. Verify all fields editable
5. Capture screenshot

**Screenshot**: `.ralph/screenshots/edit-event-dialog.png`

**Expected result**: Dialog pre-fills correctly, form is editable.

##### 7.10. Delete Confirmation Dialog

**Steps**:

1. Navigate to trip detail page
2. Click delete button on an event (as creator or organizer)
3. Verify confirmation dialog appears with warning message:
   - "Are you sure you want to delete this event? Organizers can restore it later."
4. Capture screenshot

**Screenshot**: `.ralph/screenshots/delete-confirmation.png`

**Expected result**: Confirmation dialog displays with clear warning, cancel and confirm buttons visible.

##### 7.11. Deleted Items Section (Optional)

**Steps**:

1. If deleted items section is implemented in UI:
   - Navigate to trip management/settings page
   - Locate "Deleted Items" section
   - Verify list of soft-deleted events with restore buttons
   - Capture screenshot

**Screenshot**: `.ralph/screenshots/deleted-items-section.png`

**Expected result**: Deleted items listed with restore capability visible to organizers.

##### 7.12. Responsive Tablet Layout

**Steps**:

1. Resize viewport to tablet size (768x1024)
2. Navigate to trip detail page
3. Verify itinerary displays correctly at tablet breakpoint
4. Verify cards and buttons are appropriately sized
5. Capture screenshot

**Screenshot**: `.ralph/screenshots/itinerary-tablet.png`

**Expected result**: Tablet layout displays correctly, no horizontal overflow, proper spacing.

##### 7.13. Empty Itinerary State

**Steps**:

1. Create a new trip with no events, accommodations, or member travel
2. Navigate to trip detail page
3. Verify empty state message displays: "No itinerary items yet. Add your first event to get started!"
4. Verify "Add Event" button visible and functional
5. Capture screenshot

**Screenshot**: `.ralph/screenshots/empty-itinerary.png`

**Expected result**: Empty state displays friendly message and clear call-to-action.

---

### 8. Accessibility Checks (Manual)

Verify accessibility standards are met.

**Keyboard navigation**:

- Tab through itinerary components
- Verify focus rings are visible (design system defines focus styles)
- Verify all interactive elements are keyboard-accessible (buttons, toggles, dialogs)

**Screen reader compatibility** (if possible):

- Use screen reader to navigate itinerary
- Verify ARIA labels are present and descriptive
- Verify semantic HTML structure (headings, lists, etc.)

**Color contrast**:

- Verify text meets WCAG AA contrast requirements
- Verify interactive elements have sufficient contrast

**Expected result**: No accessibility violations, keyboard navigation works, focus rings visible.

---

### 9. Visual Design Verification

Verify UI matches design system documented in `docs/2026-02-01-tripful-mvp/DESIGN.md`.

**Colors**:

- Primary: Azure blue (#1A5F9E) for actions/links
- Accent: Terracotta (#D4603A) for secondary CTAs
- Background: Warm cream (#FAF5EE)
- Card surfaces: White (#FFFFFF)
- Borders: Warm (#E5DDD2)
- Event types: Blue (travel), Purple (accommodation), Amber (meals), Emerald (activities)

**Typography**:

- Titles: Playfair Display (serif)
- Body: DM Sans (sans-serif)
- Page titles: text-4xl font-bold
- Card titles: text-xl font-semibold

**Spacing**:

- Card padding: 16-24px
- Section spacing: 32-48px

**Expected result**: All components follow Mediterranean design system, no visual inconsistencies.

---

### 10. Database Verification

Verify database schema is correct and migrations applied successfully.

```bash
cd apps/api
pnpm db:studio
```

**Navigate to Drizzle Studio** (http://localhost:4983) and verify:

- `events` table exists with correct columns and indexes
- `accommodations` table exists with correct columns and indexes
- `member_travel` table exists with correct columns and indexes
- Enums `event_type` and `member_travel_type` exist with correct values
- Foreign key constraints are correct (cascading deletes)
- Soft delete columns (`deletedAt`, `deletedBy`) exist and are nullable

**Expected result**: All tables, columns, indexes, and constraints are correct.

---

### 11. API Endpoint Verification (Manual)

Test API endpoints directly using curl or Postman.

**Get auth token** (replace with your test user):

```bash
# Login and get token
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15555555555", "code": "123456"}'

# Extract token from response
export TOKEN="your-jwt-token-here"
```

**Test event endpoints**:

```bash
# Create event
curl -X POST http://localhost:8000/api/trips/{tripId}/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dinner at Trattoria",
    "description": "Italian restaurant reservation",
    "eventType": "meal",
    "location": "123 Main St",
    "startTime": "2026-03-15T19:00:00Z",
    "endTime": "2026-03-15T21:00:00Z",
    "allDay": false,
    "isOptional": false,
    "links": ["https://example.com/reservation"]
  }'

# List events
curl -X GET http://localhost:8000/api/trips/{tripId}/events \
  -H "Authorization: Bearer $TOKEN"

# Update event
curl -X PUT http://localhost:8000/api/trips/{tripId}/events/{eventId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Dinner at Trattoria"}'

# Delete event (soft delete)
curl -X DELETE http://localhost:8000/api/trips/{tripId}/events/{eventId} \
  -H "Authorization: Bearer $TOKEN"

# Restore event
curl -X POST http://localhost:8000/api/trips/{tripId}/events/{eventId}/restore \
  -H "Authorization: Bearer $TOKEN"
```

**Test permission checks**:

```bash
# Try to create event without auth (should return 401)
curl -X POST http://localhost:8000/api/trips/{tripId}/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Event"}'

# Try to create accommodation as non-organizer (should return 403)
# (Use token for non-organizer member)
curl -X POST http://localhost:8000/api/trips/{tripId}/accommodations \
  -H "Authorization: Bearer $NON_ORGANIZER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hotel", "checkIn": "2026-03-15", "checkOut": "2026-03-17"}'
```

**Expected result**:

- All endpoints return correct status codes (200, 201, 400, 401, 403, 404)
- Validation errors return detailed messages
- Permission checks work correctly
- Soft delete and restore work

---

## Success Criteria

Phase 4 verification is complete when:

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All component tests pass
- ✅ TypeScript type checking passes with no errors
- ✅ Linting passes with no errors (warnings minimized)
- ✅ All E2E tests pass
- ✅ All manual testing scenarios completed with screenshots captured
- ✅ Accessibility checks pass (keyboard navigation, focus rings, ARIA labels)
- ✅ Visual design verified against design system
- ✅ Database schema verified in Drizzle Studio
- ✅ API endpoints manually tested and working correctly
- ✅ Permission checks prevent unauthorized actions
- ✅ Soft delete and restore functionality works
- ✅ Timezone conversion displays correctly
- ✅ View mode switching works (day-by-day ↔ group-by-type)

---

## Troubleshooting

### PostgreSQL not running

```bash
pnpm docker:up
```

### Database migrations not applied

```bash
cd apps/api
pnpm db:migrate
```

### Dev servers not starting

```bash
# Kill existing processes
pkill -f "next dev"
pkill -f "tsx watch"

# Restart
pnpm dev
```

### Playwright not installed

```bash
cd apps/web
npx playwright install chromium
```

### Tests failing with "Database connection error"

- Verify `DATABASE_URL` in `apps/api/.env`
- Verify PostgreSQL is running on port 5433
- Run `pnpm db:migrate` to ensure schema is up-to-date

### E2E tests timing out

- Increase timeout in Playwright config
- Verify dev servers are running and accessible
- Check for console errors in browser DevTools

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
**Phase**: 4 (Itinerary View Modes)
