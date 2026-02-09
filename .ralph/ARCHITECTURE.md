# Phase 5: Invitations & RSVP - Architecture

Phase 5 adds trip invitations by phone number, RSVP management, partial trip previews for invited-but-not-RSVP'd members, member list UI, and the "member no longer attending" indicator on events.

## Key Decisions

- **Mock SMS only** - No Twilio integration; use existing mock SMS service (console logging)
- **Reuse `/trips/[id]`** - Conditional rendering on existing trip detail page (no new `/t/[id]` route)
- **Add `isOrganizer` column** to members table - Replaces the current "all going = organizer" model
- **Server-side filtering** for partial preview - API returns limited data for non-RSVP'd members
- **Invitation + member on invite** - Both records created when organizer invites someone
- **25 member limit enforced** on invitations
- **Batch invite** - Dialog supports multiple phone numbers at once
- **`creatorAttending` computed field** on event responses for "member no longer attending" indicator

## DB Schema Changes

### New: `invitations` table

File: `apps/api/src/db/schema/index.ts`

```typescript
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "failed",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id),
    inviteePhone: varchar("invitee_phone", { length: 20 }).notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tripIdIdx: index("invitations_trip_id_idx").on(table.tripId),
    inviteePhoneIdx: index("invitations_invitee_phone_idx").on(table.inviteePhone),
    tripPhoneUnique: unique("invitations_trip_phone_unique").on(
      table.tripId,
      table.inviteePhone,
    ),
  }),
);
```

### Modified: `members` table - Add `isOrganizer` column

```typescript
// Add to members table definition:
isOrganizer: boolean("is_organizer").notNull().default(false),
```

Migration must:
1. Add `is_organizer` column with default `false`
2. Set `is_organizer = true` for members whose `user_id = trips.created_by` (trip creators only)

### Modified: Event responses - Add `creatorAttending` computed field

The event list endpoint (`GET /api/trips/:tripId/events`) must join with members table to check if each event's creator currently has `status = 'going'` and include `creatorAttending: boolean` in the response.

## Permissions Service Changes

File: `apps/api/src/services/permissions.service.ts`

The `isOrganizer` method currently checks: creator OR member with `status='going'`. This must change to: creator OR member with `isOrganizer=true`.

```typescript
// BEFORE:
.leftJoin(members, and(
  eq(members.tripId, trips.id),
  eq(members.userId, userId),
  eq(members.status, "going"),  // <-- REMOVE THIS
))

// AFTER:
.leftJoin(members, and(
  eq(members.tripId, trips.id),
  eq(members.userId, userId),
  eq(members.isOrganizer, true),  // <-- NEW
))
```

All downstream methods that delegate to `isOrganizer` (canEditTrip, canDeleteTrip, canManageCoOrganizers, canAddAccommodation, etc.) automatically inherit the fix.

### New permission methods:

```typescript
canInviteMembers(userId: string, tripId: string): Promise<boolean>;  // organizers only
canUpdateRsvp(userId: string, tripId: string): Promise<boolean>;     // any member
canViewFullTrip(userId: string, tripId: string): Promise<boolean>;   // members with status='going'
```

### Updated `canAddEvent` logic:

Currently checks `status='going'` for member event permissions. With the new model:
- Organizers (`isOrganizer=true`) can always add events
- Regular members need `status='going'` AND `allowMembersToAddEvents=true`
- Members who changed from Going to Maybe/Not Going can no longer add/edit events

### Updated `canEditEvent` logic:

Event creator can only edit if they still have `status='going'`. If they changed to Maybe/Not Going, only organizers can edit their events.

## API Endpoints

### Invitation Endpoints

File: `apps/api/src/routes/invitation.routes.ts`

**POST /api/trips/:tripId/invitations** - Batch invite members
```
Request:
  { phoneNumbers: string[] }  // Array of E.164 phone numbers

Response (201):
  {
    success: true,
    invitations: Invitation[],
    skipped: string[]  // Phone numbers already invited
  }

Errors:
  403 - Not an organizer
  404 - Trip not found
  400 - MEMBER_LIMIT_EXCEEDED (would exceed 25)
  400 - VALIDATION_ERROR (invalid phone numbers)
```

Logic:
1. Check user is organizer
2. Check member count + new invites <= 25
3. For each phone number:
   a. Skip if already invited (return in `skipped`)
   b. Create invitation record (status='pending')
   c. If user exists in DB: create member record (status='no_response')
   d. If user doesn't exist: create invitation only (member created on first login/auth)
   e. Mock-send SMS via existing SMS service
4. Return created invitations and skipped phones

**GET /api/trips/:tripId/invitations** - List invitations (organizers only)
```
Response (200):
  {
    success: true,
    invitations: Array<Invitation & { inviteeName?: string }>
  }
```

**DELETE /api/trips/:tripId/invitations/:invitationId** - Revoke invitation (organizers only)
```
Response (200):
  { success: true }
```

### RSVP Endpoint

**POST /api/trips/:tripId/rsvp** - Update RSVP status
```
Request:
  { status: "going" | "not_going" | "maybe" }

Response (200):
  {
    success: true,
    member: { id, userId, tripId, status, isOrganizer }
  }

Errors:
  403 - Not a member of this trip
  404 - Trip not found
```

Logic:
1. Check user has a member record for this trip
2. Update member.status
3. Return updated member

### Modified: GET /api/trips/:tripId

Currently returns null (404) for non-members. Must now differentiate:

1. **Uninvited user** -> 404 "Trip not found"
2. **Invited member (not RSVP'd Going)** -> 200 with partial preview:
   ```json
   {
     "trip": {
       "id", "name", "destination", "startDate", "endDate",
       "preferredTimezone", "description", "coverImageUrl"
     },
     "organizers": [...],
     "memberCount": number,
     "userRsvpStatus": "no_response" | "maybe" | "not_going",
     "isOrganizer": boolean,
     "isPreview": true
   }
   ```
3. **Going member** -> 200 with full trip data (current behavior + `isPreview: false`)

### Modified: GET /api/trips/:tripId/events

Add `creatorAttending` field to each event in response:
```json
{
  "events": [
    {
      "id": "...",
      "creatorAttending": true,  // NEW: creator's current RSVP status = 'going'
      "creatorName": "John",     // NEW: creator's display name
      "creatorProfilePhotoUrl": "..."  // NEW: creator's avatar
      // ... existing fields
    }
  ]
}
```

### New: GET /api/trips/:tripId/members - List trip members

```
Response (200):
  {
    success: true,
    members: Array<{
      id: string,
      userId: string,
      displayName: string,
      profilePhotoUrl: string | null,
      phoneNumber: string,  // Only visible to organizers
      status: "going" | "not_going" | "maybe" | "no_response",
      isOrganizer: boolean,
      createdAt: string
    }>
  }
```

Access: Any member can view (but phone numbers only visible to organizers).

## Invitation Service

File: `apps/api/src/services/invitation.service.ts`

```typescript
export interface IInvitationService {
  createInvitations(
    userId: string,
    tripId: string,
    phoneNumbers: string[],
  ): Promise<{ invitations: Invitation[]; skipped: string[] }>;

  getInvitationsByTrip(tripId: string): Promise<Invitation[]>;

  revokeInvitation(userId: string, invitationId: string): Promise<void>;

  updateRsvp(
    userId: string,
    tripId: string,
    status: "going" | "not_going" | "maybe",
  ): Promise<Member>;

  getTripMembers(
    tripId: string,
    requestingUserId: string,
  ): Promise<MemberWithProfile[]>;

  // Called during auth flow: when a new user registers, check for pending
  // invitations matching their phone and create member records
  processPendingInvitations(userId: string, phoneNumber: string): Promise<void>;
}
```

Plugin: `apps/api/src/plugins/invitation-service.ts`

## Shared Schemas

File: `shared/schemas/invitation.ts`

```typescript
export const createInvitationsSchema = z.object({
  phoneNumbers: z.array(phoneNumberSchema).min(1).max(25),
});

export const updateRsvpSchema = z.object({
  status: z.enum(["going", "not_going", "maybe"]),
});

export type CreateInvitationsInput = z.infer<typeof createInvitationsSchema>;
export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>;
```

File: `shared/schemas/index.ts` - Add re-exports

## Shared Types

File: `shared/types/invitation.ts`

```typescript
export interface Invitation {
  id: string;
  tripId: string;
  inviterId: string;
  inviteePhone: string;
  status: "pending" | "accepted" | "declined" | "failed";
  sentAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberWithProfile {
  id: string;
  userId: string;
  displayName: string;
  profilePhotoUrl: string | null;
  phoneNumber?: string;  // Only included for organizers
  status: "going" | "not_going" | "maybe" | "no_response";
  isOrganizer: boolean;
  createdAt: string;
}

export interface CreateInvitationsResponse {
  success: true;
  invitations: Invitation[];
  skipped: string[];
}

export interface GetInvitationsResponse {
  success: true;
  invitations: Invitation[];
}

export interface UpdateRsvpResponse {
  success: true;
  member: MemberWithProfile;
}

export interface GetMembersResponse {
  success: true;
  members: MemberWithProfile[];
}
```

File: `shared/types/index.ts` - Add re-exports

## Frontend Changes

### Modified: Trip Detail Page

File: `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`

Add conditional rendering based on `isPreview` flag from API:

```
if (isPreview) {
  return <TripPreview trip={trip} onRsvp={handleRsvp} />;
}
// ... existing full trip detail rendering
```

### New: TripPreview Component

File: `apps/web/src/components/trip/trip-preview.tsx`

Shows:
- Trip name, destination, dates, description, cover image
- Organizer names and avatars
- RSVP buttons (Going / Maybe / Not Going)
- After RSVPing "Going", invalidate queries and show full trip

### New: InviteMembersDialog

File: `apps/web/src/components/trip/invite-members-dialog.tsx`

- Phone number input with PhoneInput component (existing)
- "Add" button to add to list
- List of phone numbers to invite (removable chips)
- Submit sends batch invite request
- Shows results (invited, skipped, errors)
- Uses React Hook Form + Zod (createInvitationsSchema)

### New: MembersList Component

File: `apps/web/src/components/trip/members-list.tsx`

- Tab/section on trip detail page
- Shows member avatars, names, RSVP status badges
- Organizer badge on organizers
- Organizer-only: phone numbers, remove member button, invite button

### Modified: Event Cards

File: `apps/web/src/components/itinerary/event-card.tsx`

- If `creatorAttending === false`, show "Member no longer attending" badge/indicator
- Muted/dimmed styling on the creator name area

### New: TanStack Query Hooks

File: `apps/web/src/hooks/use-invitations.ts` + `invitation-queries.ts`

```typescript
export const invitationKeys = {
  all: (tripId: string) => ["trips", tripId, "invitations"] as const,
};

export function useInviteMembers(tripId: string);  // mutation
export function useInvitations(tripId: string);     // query (organizers)
export function useRevokeInvitation(tripId: string); // mutation
```

File: `apps/web/src/hooks/use-members.ts` + `member-queries.ts`

```typescript
export const memberKeys = {
  all: (tripId: string) => ["trips", tripId, "members"] as const,
};

export function useMembers(tripId: string);  // query
export function useUpdateRsvp(tripId: string);  // mutation
```

### Modified: Existing Hooks

- `useTripDetail` - handle `isPreview` in response type
- `useEvents` - include `creatorAttending` in Event type

## Trip Service Changes

File: `apps/api/src/services/trip.service.ts`

### `createTrip` changes:
- When creating trip, set creator's member record `isOrganizer: true`
- When adding co-organizers, set their member records `isOrganizer: true`

### `addCoOrganizers` changes:
- Set `isOrganizer: true` on new co-organizer member records

### `removeCoOrganizer` changes:
- No longer deletes the member record entirely
- Instead sets `isOrganizer: false` and `status: 'no_response'` (removed from trip effectively)
- OR: keep current delete behavior (removes member entirely)

Decision: Keep delete behavior - removing a co-organizer removes them from the trip.

### `getTripById` changes:
- Organizer detection: check `isOrganizer` column instead of `status='going'`
- Add `isPreview` and `userRsvpStatus` to response
- For non-Going members, return partial data (no itinerary reference)

### `getUserTrips` changes:
- Update organizer detection to use `isOrganizer` column instead of `status='going'`

## Auth Flow Integration

File: `apps/api/src/services/auth.service.ts`

After a new user completes registration (or existing user logs in), call `invitationService.processPendingInvitations(userId, phoneNumber)` to:
1. Find all invitations matching this phone number
2. For each, create a member record if one doesn't exist
3. Update invitation status to 'accepted' (they've at least created an account)

## E2E Test Updates

### Existing tests must be updated:

The `isOrganizer` migration changes permissions. Currently co-organizers are added with `status='going'`, which made them organizers. After the migration:
- Co-organizers need `isOrganizer: true` in the members table
- The `addCoOrganizers` endpoint already handles this (it will set `isOrganizer: true`)
- The API-level co-organizer addition in `trip-journey.spec.ts` should still work because it calls the API endpoint

Key test changes:
- `trip-journey.spec.ts` - The permission test uses `POST /api/trips/:tripId/co-organizers` which will be updated to set `isOrganizer: true`. Should work without E2E test changes.
- `itinerary-journey.spec.ts` - Tests where a trip creator operates should work since creator's member record gets `isOrganizer: true` in `createTrip`.

### New E2E test helpers:

File: `apps/web/tests/e2e/helpers/invitations.ts`

```typescript
// API-level helper: invite a user to a trip and RSVP
export async function inviteAndAcceptViaAPI(
  request: APIRequestContext,
  tripId: string,
  inviterPhone: string,
  inviteePhone: string,
  inviteeName: string,
): Promise<void>;
```

### New E2E test file:

File: `apps/web/tests/e2e/invitation-journey.spec.ts`

Tests:
1. Organizer invites members via UI dialog
2. Invited member sees partial preview
3. Member RSVPs Going and sees full itinerary
4. Member changes RSVP and "member no longer attending" appears on events
5. Uninvited user sees 404
6. Member list shows correct statuses

## Testing Strategy

- **Unit tests**: InvitationService methods, permissions changes, schema validation
- **Integration tests**: Invitation endpoints, RSVP endpoint, modified trip endpoints
- **E2E tests**: Full invitation flow, RSVP flow, preview, member list, status changes
- **Manual testing**: UI polish, responsive design, toast notifications
