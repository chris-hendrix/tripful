# Mutuals Invite — Architecture

Mutuals are users who share at least one trip. This feature adds a mutuals listing page, a mutual profile sheet, mutual-based invitations (bypassing SMS), and two new notification types (`mutual_invite`, `sms_invite`).

## Backend

### Mutuals Service (`apps/api/src/services/mutuals.service.ts`)

New service with an interface (`IMutualsService`) registered on the Fastify instance (same pattern as `IInvitationService`, `INotificationService`).

```typescript
interface IMutualsService {
  getMutuals(params: {
    userId: string;
    tripId?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ mutuals: Mutual[]; nextCursor: string | null }>;

  getMutualSuggestions(params: {
    userId: string;
    tripId: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ mutuals: Mutual[]; nextCursor: string | null }>;
}

interface Mutual {
  id: string; // user.id
  displayName: string;
  profilePhotoUrl: string | null;
  sharedTripCount: number;
  sharedTrips: { id: string; name: string }[];
}
```

**Core query** (derived from `members` + `users` + `trips` — no new tables):

```sql
SELECT DISTINCT u.id, u.display_name, u.profile_photo_url,
       COUNT(DISTINCT m.trip_id) as shared_trip_count
FROM users u
JOIN members m ON m.user_id = u.id
JOIN members my_m ON my_m.trip_id = m.trip_id AND my_m.user_id = :currentUserId
WHERE u.id != :currentUserId
GROUP BY u.id, u.display_name, u.profile_photo_url
ORDER BY shared_trip_count DESC, u.display_name ASC, u.id ASC
```

**Cursor pagination**: Keyset-based on `(shared_trip_count DESC, display_name ASC, id ASC)`. Cursor is a base64-encoded JSON `{count, name, id}`. Default limit: 20.

**`getMutualSuggestions`**: Same query but adds `WHERE u.id NOT IN (SELECT user_id FROM members WHERE trip_id = :tripId)` to exclude current trip members. Requires organizer role (checked via `permissionsService.isOrganizer`).

**Shared trips sub-query**: For each mutual in the page, batch-load shared trips (trip id + name) from `members` + `trips` tables. Returns as array on each mutual object.

**Trip filter**: When `tripId` query param is provided on `GET /mutuals`, adds `WHERE m.trip_id = :tripId` to the join condition to filter mutuals to those who share that specific trip.

**Search**: When `search` query param is provided, adds `WHERE LOWER(u.display_name) LIKE LOWER(:search || '%')` for prefix matching.

### Mutuals Controller (`apps/api/src/controllers/mutuals.controller.ts`)

Two handler methods following existing controller pattern (extract params, call service, return response, catch typed errors):

- `getMutuals(request, reply)` — extracts query params, calls service, returns paginated response
- `getMutualSuggestions(request, reply)` — extracts tripId param + query params, checks organizer role, calls service

### Mutuals Routes (`apps/api/src/routes/mutuals.routes.ts`)

```
GET /api/mutuals                              — authenticate, defaultRateLimit
GET /api/trips/:tripId/mutual-suggestions     — authenticate, requireCompleteProfile, defaultRateLimit
```

Both read-only, so no write-scoped plugin needed. Register in `apps/api/src/routes/index.ts` alongside existing route registrations.

### Extended Invitation Service (`apps/api/src/services/invitation.service.ts`)

**`createInvitations` method changes:**

- Accept optional `userIds: string[]` in addition to `phoneNumbers` (both now optional, at least one required)
- For `userIds` flow:
  1. Verify each userId is a mutual of the inviter (security — can't add arbitrary users). Query `members` table for shared trip membership.
  2. Check member limit (same 25-cap, counting current members + new phone invites + new mutual invites)
  3. Skip userIds already in the trip as members
  4. Create `members` records with `status: 'no_response'`, `isOrganizer: false`
  5. Send `mutual_invite` notification to each invited user via `notificationService.createNotification`
- For `phoneNumbers` flow: existing logic unchanged, but now ALSO send `sms_invite` notification to existing users who get auto-added as members (currently they get a member record but no in-app notification)

**Notification payloads:**

```typescript
// For mutual invites
await this.notificationService.createNotification({
  userId: inviteeUserId,
  tripId,
  type: "mutual_invite",
  title: "Trip invitation",
  body: `${inviterDisplayName} invited you to ${tripName}`,
  data: { inviterId: userId },
});

// For SMS invites to existing users
await this.notificationService.createNotification({
  userId: existingUser.id,
  tripId,
  type: "sms_invite",
  title: "Trip invitation",
  body: `${inviterDisplayName} invited you to ${tripName}`,
  data: { inviterId: userId },
});
```

**Response shape changes** (`CreateInvitationsResponse`):

```typescript
{
  success: true,
  invitations: Invitation[],       // SMS-based invitation records (unchanged)
  addedMembers: { userId: string; displayName: string }[],  // NEW: mutual invites
  skipped: string[],               // skipped phone numbers + skipped userIds
}
```

### Service Registration

Register `IMutualsService` on Fastify instance in `apps/api/src/types/index.ts` (add to FastifyInstance interface) and create in `apps/api/src/server.ts` (or wherever services are wired up).

### No Database Migrations

All data is derived from existing `members`, `users`, and `trips` tables. No schema changes needed.

## Shared Package

### New Types (`shared/types/mutuals.ts`)

```typescript
export interface Mutual {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  sharedTripCount: number;
  sharedTrips: { id: string; name: string }[];
}

export interface GetMutualsResponse {
  success: true;
  mutuals: Mutual[];
  nextCursor: string | null;
}
```

Export from `shared/types/index.ts`.

### Updated Types (`shared/types/notification.ts`)

Add `"mutual_invite"` and `"sms_invite"` to `NotificationType` union:

```typescript
export type NotificationType =
  | "daily_itinerary"
  | "trip_message"
  | "trip_update"
  | "mutual_invite"
  | "sms_invite";
```

### Updated Types (`shared/types/invitation.ts`)

Add `addedMembers` to `CreateInvitationsResponse`:

```typescript
export interface CreateInvitationsResponse {
  success: true;
  invitations: Invitation[];
  addedMembers: { userId: string; displayName: string }[];
  skipped: string[];
}
```

### New Schemas (`shared/schemas/mutuals.ts`)

```typescript
export const getMutualsQuerySchema = z.object({
  tripId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

export const getMutualSuggestionsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});
```

Export from `shared/schemas/index.ts`.

### Updated Schemas (`shared/schemas/invitation.ts`)

```typescript
export const createInvitationsSchema = z
  .object({
    phoneNumbers: z.array(phoneNumberSchema).max(25).optional().default([]),
    userIds: z.array(z.string().uuid()).max(25).optional().default([]),
  })
  .refine((data) => data.phoneNumbers.length > 0 || data.userIds.length > 0, {
    message: "At least one phone number or user ID is required",
  });
```

This is a breaking change to the schema — the frontend form and hook must be updated accordingly. The `CreateInvitationsInput` inferred type will change.

## Frontend

### Mutuals Page (`apps/web/src/app/(app)/mutuals/`)

- `page.tsx` — Server component with metadata (`title: "My Mutuals"`)
- `mutuals-content.tsx` — Client component

**Layout:** Search bar at top, trip filter dropdown, avatar grid/list. Each card shows avatar, display name, "N shared trips". Cards are clickable to open the mutual profile sheet.

**Empty state:** Friendly message for users with no mutuals yet (e.g., "No mutuals yet — plan a trip to connect with others").

**Trip filter:** Dropdown populated from user's existing trips query. When selected, passes `tripId` query param to the API.

**Search:** Debounced input (300ms) that sets `search` query param on the API call.

**Infinite scroll:** Uses TanStack Query `useInfiniteQuery` with cursor pagination. Load more triggered by intersection observer or "Load more" button.

### Mutual Profile Sheet (`apps/web/src/components/mutuals/mutual-profile-sheet.tsx`)

A shadcn `Sheet` component (same as invite dialog):

- Large avatar with fallback initials
- Display name
- "N shared trips" subtitle
- List of shared trips as clickable `<Link>` to `/trips/:id`
- No action buttons (invite happens from the trip's invite dialog)

### Updated App Header (`apps/web/src/components/app-header.tsx`)

Add "My Mutuals" menu item in the user dropdown, between the profile item and separator:

```tsx
<DropdownMenuItem asChild>
  <Link href="/mutuals">
    <Users className="mr-2 h-4 w-4" />
    My Mutuals
  </Link>
</DropdownMenuItem>
<DropdownMenuSeparator />
```

### Updated Invite Dialog (`apps/web/src/components/trip/invite-members-dialog.tsx`)

Two-section layout:

1. **Mutuals section** (top) — shown only if organizer AND mutual suggestions exist for this trip
   - Searchable list with checkboxes and avatars
   - Selected mutuals shown as badge chips (like phone chips pattern)
   - Uses `GET /trips/:tripId/mutual-suggestions` endpoint
   - Search filters the list client-side (or server-side via query param)

2. **Divider**: "Or invite by phone number"

3. **Phone section** (bottom) — existing phone input, unchanged

Single submit sends both `userIds` (from selected mutuals) and `phoneNumbers`.

The form schema changes from `createInvitationsSchema` (phone-only) to the new schema accepting both arrays.

### Mutuals Query Hooks (`apps/web/src/hooks/`)

**`mutuals-queries.ts`** — Query key factory and query options:

```typescript
export const mutualKeys = {
  all: ["mutuals"] as const,
  lists: () => ["mutuals", "list"] as const,
  list: (filters: Record<string, unknown>) =>
    ["mutuals", "list", filters] as const,
  suggestions: () => ["mutuals", "suggestions"] as const,
  suggestion: (tripId: string) => ["mutuals", "suggestions", tripId] as const,
};
```

**`use-mutuals.ts`** — Hooks:

- `useMutuals(params)` — `useInfiniteQuery` for `GET /mutuals` with cursor pagination
- `useMutualSuggestions(tripId)` — `useQuery` for `GET /trips/:tripId/mutual-suggestions` (no pagination needed for suggestions in the invite dialog — return all)

### Notification Updates

**`apps/web/src/components/notifications/notification-item.tsx`**: Add icons for new types:

```typescript
import { UserPlus } from "lucide-react";

const typeIcons: Record<NotificationType, ElementType> = {
  daily_itinerary: Calendar,
  trip_message: MessageCircle,
  trip_update: Bell,
  mutual_invite: UserPlus,
  sms_invite: UserPlus,
};
```

**Navigation**: Both `mutual_invite` and `sms_invite` have `tripId` in the notification, so the existing default navigation (`router.push(/trips/${notification.tripId})`) handles them correctly. No special-casing needed.

### Updated Invitation Hook (`apps/web/src/hooks/use-invitations.ts`)

Update `useInviteMembers` mutation:

- Accept new schema shape `{ phoneNumbers?: string[], userIds?: string[] }`
- On success, invalidate `mutualKeys.suggestion(tripId)` alongside existing `invitationKeys` and `memberKeys` invalidations
- Update `getInviteMembersErrorMessage` for any new error codes

## Testing Strategy

### Unit Tests

- Mutuals service: core query, cursor pagination, search filtering, trip filtering, empty results
- Extended invitation service: mutual invite creates members + notifications, SMS invite creates notifications for existing users, mixed invites, member limit enforcement, mutual verification (non-mutual user rejected), skip existing members

### Integration Tests

- `GET /mutuals` — requires auth, returns paginated mutuals, search filter, trip filter, empty for new user
- `GET /trips/:tripId/mutual-suggestions` — requires auth + organizer, excludes existing members, returns 403 for non-organizer
- `POST /trips/:tripId/invitations` — mixed payload (userIds + phoneNumbers), mutual-only payload, phone-only payload (backwards compatible), notification created for mutual invites, notification created for SMS invites to existing users

### E2E Tests (Core Flows)

- View mutuals page (logged in user with co-trip history sees mutuals)
- Invite a mutual from trip invite dialog (organizer sees suggestion, selects, submits, member appears)

### Manual Testing

- Mutuals page layout, empty state, search, trip filter, infinite scroll
- Mutual profile sheet appearance and shared trip links
- Invite dialog two-section layout with mutuals picker
- Notification bell shows mutual_invite notification after invite
