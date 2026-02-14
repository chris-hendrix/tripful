# Phase 7: Polish & Testing - Architecture

Phase 7 adds three concrete features (co-organizer promote/demote, member travel delegation, entity count limits), then audits and improves responsive design, performance, test coverage, and documentation.

## 1. Co-organizer Promote/Demote

Allow organizers to promote existing trip members to co-organizer or demote co-organizers back to regular members, directly from the members dialog.

### Backend

**New endpoint**: `PATCH /api/trips/:tripId/members/:memberId`

```typescript
// Request body
{ isOrganizer: boolean }

// Response
{ success: true, member: { id, userId, status, isOrganizer, ... } }
```

**Service method**: Add `updateMemberRole(userId, tripId, memberId, isOrganizer)` to `InvitationService` (`apps/api/src/services/invitation.service.ts`).

**Permission rules**:
- Only organizers can call this endpoint
- Cannot demote the trip creator (the user whose `userId === trip.createdBy`)
- Cannot promote/demote yourself
- Target must be an existing member of the trip

**Shared schema** (`shared/schemas/member.ts` - new file):
```typescript
export const updateMemberRoleSchema = z.object({
  isOrganizer: z.boolean(),
});
```

**Route registration**: Add to `apps/api/src/routes/trip.routes.ts` in the authenticated scope, alongside existing member routes.

**Controller**: Add `updateMemberRole` method to `apps/api/src/controllers/trip.controller.ts`.

### Frontend

**MembersList component** (`apps/web/src/components/trip/members-list.tsx`):
- Add a dropdown menu (or icon button) on each member row for organizers
- Menu items: "Make Co-organizer" / "Remove Co-organizer" (conditional on current `isOrganizer` state)
- Cannot show demote option on trip creator
- Use existing DropdownMenu component from shadcn/ui

**New hook**: `useUpdateMemberRole` mutation in `apps/web/src/lib/hooks/` using TanStack Query.

### Existing Co-organizer API

The existing `POST /api/trips/:id/co-organizers` (add by phone number) is **kept unchanged**. The new promote/demote operates on existing members only.

---

## 2. Member Travel Delegation

Allow organizers to add member travel on behalf of any trip member, not just themselves.

### Backend

**Schema change** (`shared/schemas/member-travel.ts`):
- Add optional `memberId` field to `createMemberTravelSchema`:
```typescript
export const createMemberTravelSchema = baseMemberTravelSchema.extend({
  memberId: z.string().uuid().optional(),
});
```

**Service change** (`apps/api/src/services/member-travel.service.ts`):
- Modify `createMemberTravel(userId, tripId, data)`:
  - If `data.memberId` is provided:
    - Check that requesting user is an organizer (via `permissionsService.isOrganizer()`)
    - Validate that `memberId` belongs to an existing member of the trip
    - Use provided `memberId` instead of resolving from `userId`
  - If `data.memberId` is NOT provided:
    - Keep existing behavior (resolve memberId from userId)

**Permission change** (`apps/api/src/services/permissions.service.ts`):
- `canAddMemberTravel` remains unchanged (checks membership)
- New check inside `createMemberTravel` for delegation: `isOrganizer(userId, tripId)`

### Frontend

**CreateMemberTravelDialog** (`apps/web/src/components/itinerary/create-member-travel-dialog.tsx`):
- Add member selector at the top of the form (before travel type)
- Fetch trip members using existing TanStack Query hook
- **For regular members**: Show own avatar, name (disabled/read-only)
- **For organizers**: Show dropdown with all trip members, defaults to self
- Helper text for organizers: "As organizer, you can add member travel for any member"
- Pass selected `memberId` in API request body

**Member selector component**: Use existing Avatar + Select components from shadcn/ui.

---

## 3. Entity Count Limits

Enforce maximum entity counts per the PRD Data Validation requirements. Only count active (non-soft-deleted) items.

### Limits

| Entity | Limit | Scope |
|--------|-------|-------|
| Events | 50 | Per trip |
| Accommodations | 10 | Per trip |
| Member Travel | 20 | Per member (within a trip) |

### Backend

**EventService** (`apps/api/src/services/event.service.ts`):
- In `createEvent()`, before inserting, count active events for the trip:
  ```sql
  SELECT COUNT(*) FROM events WHERE trip_id = ? AND deleted_at IS NULL
  ```
- Throw `EventLimitExceededError` if count >= 50

**AccommodationService** (`apps/api/src/services/accommodation.service.ts`):
- In `createAccommodation()`, count active accommodations for the trip
- Throw `AccommodationLimitExceededError` if count >= 10

**MemberTravelService** (`apps/api/src/services/member-travel.service.ts`):
- In `createMemberTravel()`, count active member travel for the specific member
- Throw `MemberTravelLimitExceededError` if count >= 20

**Error definitions** (`apps/api/src/errors.ts`):
- Add three new error classes following existing `MemberLimitExceededError` pattern
- HTTP status: 400
- Error codes: `EVENT_LIMIT_EXCEEDED`, `ACCOMMODATION_LIMIT_EXCEEDED`, `MEMBER_TRAVEL_LIMIT_EXCEEDED`

### Frontend

No frontend changes needed beyond existing error handling. The API returns error messages that are already displayed via toast notifications.

---

## 4. Accommodation Redesign

Redesign accommodations to be more minimal, show on all spanned days, and replace date-only check-in/check-out with full datetime columns.

### Data Model Changes

Convert the existing `checkIn` and `checkOut` columns from DATE to TIMESTAMP WITH TIMEZONE. Column names stay the same — only the type changes.

**DB schema** (`apps/api/src/db/schema/index.ts`):
```typescript
// BEFORE:
// checkIn: date("check_in").notNull(),
// checkOut: date("check_out").notNull(),
// AFTER:
checkIn: timestamp("check_in", { withTimezone: true }).notNull(),
checkOut: timestamp("check_out", { withTimezone: true }).notNull(),
```

Index stays the same (`checkInIdx` on `table.checkIn`).

**Migration**: Drizzle generates `ALTER COLUMN check_in TYPE timestamp with time zone`. Existing date values auto-cast to midnight UTC.

**Shared types** (`shared/types/accommodation.ts`): No changes needed — `checkIn: string` and `checkOut: string` already work for ISO datetime strings.

**Shared schemas** (`shared/schemas/accommodation.ts`):
- Replace `checkIn: z.string().date()` with `checkIn: z.string().datetime({ offset: true }).or(z.string().datetime())` (accepts ISO datetime with or without timezone)
- Same for `checkOut`
- Cross-field validation unchanged (date comparison still works with ISO datetime strings)
- Update `accommodationEntitySchema` if it has `.date()` validation

**Service** (`apps/api/src/services/accommodation.service.ts`): No field name changes needed.

**Frontend impact**: Components derive dates from `new Date(checkIn)` for day-by-day grouping. Display formatting may need updating to show time alongside date.

### Frontend: Day-by-Day View

**`apps/web/src/components/itinerary/day-by-day-view.tsx`**:

Currently accommodations only appear on check-in day. Change to show on every day the stay spans (check-in through check-out minus 1 day, since check-out day you're leaving).

- Change `DayData.accommodation: Accommodation | null` → `DayData.accommodations: Accommodation[]`
- In the data grouping logic, iterate each date from `checkIn` to the day before `checkOut` and push the accommodation to each day's array
- Render `day.accommodations` array at the top of each day

### Frontend: Accommodation Card Redesign

**`apps/web/src/components/itinerary/accommodation-card.tsx`**:

Redesign from big bordered card to a compact card with dropdown. Keep it visually distinct from the plain-text member travel lines (it's a card, not invisible) but much smaller:

- Compact state: Small pill/card with accommodation name, nights count, and check-in/check-out times. Uses subtle accommodation-colored border.
- Expanded state: Click to expand showing address (maps link), description, links, created-by, and edit button (opens edit dialog).
- Click opens expand/collapse (not the edit dialog directly — unlike member travel, accommodations have enough details to warrant an expand view).

### Frontend: Create/Edit Dialogs

**`apps/web/src/components/itinerary/create-accommodation-dialog.tsx`**:
- Add time input (`<Input type="time" />`) next to each existing DatePicker in a 2-column grid
- Combine selected date + time into ISO datetime string before form submission
- Labels: "Check-in date" + "Check-in time", "Check-out date" + "Check-out time"

**`apps/web/src/components/itinerary/edit-accommodation-dialog.tsx`**:
- Same time input additions as create dialog
- Pre-populate date and time fields by parsing `checkIn`/`checkOut` ISO datetime strings
- Fix delete button: change from big red `Button variant="destructive"` to subtle link style matching edit-trip-dialog pattern (small `Trash2` icon + text, `text-muted-foreground hover:text-destructive`)

---

## 5. Responsive Design Audit

Audit all pages at three breakpoints and fix issues.

### Breakpoints
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1024px+

### Pages to Audit
- Landing page (`/`)
- Auth pages (`/login`, `/verify`, `/complete-profile`)
- Trips dashboard (`/trips`)
- Trip detail + itinerary (`/trips/[id]`)
- Settings (`/settings`)

### Approach
- Use Playwright to navigate each page at each breakpoint
- Screenshot and identify layout issues (overflow, truncation, touch targets, spacing)
- Fix CSS/layout issues found
- Focus on content overflow, dialog sizing, and form usability on mobile

---

## 6. Performance Audit

### Backend
- **Query analysis**: Review all service methods for N+1 queries
- **Index review**: Check that all frequently-queried columns have indexes
- **Query optimization**: Use JOINs instead of sequential queries where possible
- Profile slow endpoints with Fastify logging

### Frontend
- **TanStack Query tuning**: Review staleTime, gcTime settings across all hooks
- **Bundle analysis**: Check for unnecessary imports or large dependencies
- **Re-render reduction**: Identify components that re-render unnecessarily
- Lighthouse performance audit

---

## 7. Test Coverage Gaps

### Approach
- Run `pnpm test -- --coverage` to identify untested areas
- Focus on service methods and API routes that lack tests
- Add edge case tests for existing features (error paths, boundary conditions)

### Priority Areas
- Entity count limit enforcement (new)
- Co-organizer promote/demote (new)
- Member travel delegation (new)
- Permission edge cases
- Error handling paths

---

## 8. Documentation

### ARCHITECTURE.md
- Update `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md` to reflect Phase 7 changes
- Mark Phase 7 as complete
- Document new endpoints and features

### API Documentation
- Document all API endpoints in a structured format
- Include request/response schemas, error codes, and permission requirements

---

## Testing Strategy

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|-----------|-------------------|-----------|
| Co-org promote/demote | Service method tests | Route tests (permissions, edge cases) | Promote member in members dialog |
| Member travel delegation | Service method tests | Route tests (organizer vs member) | Organizer adds travel for another member |
| Entity count limits | Service method tests | Route tests (hitting each limit) | - |
| Accommodation redesign | - | Existing tests pass with new columns | Accommodation shows on spanned days |
| Responsive design | - | - | Screenshots at breakpoints |
| Performance | - | - | Lighthouse checks |
| Test coverage gaps | New unit tests | New integration tests | - |

## File Changes Summary

### New Files
- `shared/schemas/member.ts` - updateMemberRole schema
- API docs file (format TBD)

### Modified Files
- `apps/api/src/db/schema/index.ts` - convert checkIn/checkOut from date to timestamp with timezone
- `shared/schemas/accommodation.ts` - update Zod validation from `.date()` to `.datetime()`
- `apps/api/src/services/accommodation.service.ts` - accommodation count limit
- `apps/web/src/components/itinerary/accommodation-card.tsx` - minimal card redesign with dropdown
- `apps/web/src/components/itinerary/day-by-day-view.tsx` - show accommodations on all spanned days
- `apps/web/src/components/itinerary/create-accommodation-dialog.tsx` - add time inputs
- `apps/web/src/components/itinerary/edit-accommodation-dialog.tsx` - add time inputs, fix delete button
- `shared/schemas/member-travel.ts` - add optional memberId
- `shared/schemas/index.ts` - export new schemas
- `apps/api/src/errors.ts` - add limit error classes
- `apps/api/src/services/invitation.service.ts` - add updateMemberRole
- `apps/api/src/services/member-travel.service.ts` - member travel delegation
- `apps/api/src/services/event.service.ts` - event count limit
- `apps/api/src/services/accommodation.service.ts` - accommodation count limit
- `apps/api/src/services/permissions.service.ts` - delegation permission check
- `apps/api/src/controllers/trip.controller.ts` - updateMemberRole handler
- `apps/api/src/routes/trip.routes.ts` - new PATCH route
- `apps/web/src/components/trip/members-list.tsx` - promote/demote UI
- `apps/web/src/components/itinerary/create-member-travel-dialog.tsx` - member selector
- `apps/web/src/lib/hooks/` - new mutation hooks
- `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md` - Phase 7 updates
