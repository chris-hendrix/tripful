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

## 4. Responsive Design Audit

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

## 5. Performance Audit

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

## 6. Test Coverage Gaps

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

## 7. Documentation

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
| Responsive design | - | - | Screenshots at breakpoints |
| Performance | - | - | Lighthouse checks |
| Test coverage gaps | New unit tests | New integration tests | - |

## File Changes Summary

### New Files
- `shared/schemas/member.ts` - updateMemberRole schema
- API docs file (format TBD)

### Modified Files
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
