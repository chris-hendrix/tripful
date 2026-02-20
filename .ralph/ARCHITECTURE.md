# Architecture: Member Privacy & List UX

## Overview

Add per-member phone sharing opt-in, organizer-controlled member visibility, fix organizer phone leak in TripDetail, replace Venmo text with SVG icon, and fix member list padding.

## DB Schema

Two new columns in `apps/api/src/db/schema/index.ts`:

**members table** (after `isOrganizer` at line 145):
```typescript
sharePhone: boolean("share_phone").notNull().default(false),
```

**trips table** (after `allowMembersToAddEvents` at line 113-115):
```typescript
showAllMembers: boolean("show_all_members").notNull().default(false),
```

Generate migration: `cd apps/api && pnpm db:generate`
Apply migration: `pnpm db:migrate`

## API Contracts

### Updated: `POST /trips/:tripId/rsvp`

**Route**: `apps/api/src/routes/invitation.routes.ts:146` (write scope)
**Controller**: `apps/api/src/controllers/invitation.controller.ts:269`
**Service**: `apps/api/src/services/invitation.service.ts:471` `updateRsvp()`

Extended request body:
```typescript
// shared/schemas/invitation.ts
export const updateRsvpSchema = z.object({
  status: z.enum(["going", "not_going", "maybe"]),
  sharePhone: z.boolean().optional(), // NEW
});
```

Service changes:
- Add `sharePhone?: boolean` parameter to `updateRsvp()` signature
- When `sharePhone` is provided, include `sharePhone` in the `.set()` call alongside `status`
- Controller destructures `sharePhone` from `request.body` and passes to service

### New: `GET /trips/:tripId/my-settings`

**Route**: `apps/api/src/routes/invitation.routes.ts` — read route (authenticate only, default rate limit)
**Auth**: any trip member

```typescript
// Response
{ success: true, sharePhone: boolean }
```

Service method `getMySettings(userId, tripId)`: query `members.sharePhone` where `(tripId, userId)`. Throw `PermissionDeniedError` if not a member.

### New: `PATCH /trips/:tripId/my-settings`

**Route**: `apps/api/src/routes/invitation.routes.ts` — write scope (authenticate + requireCompleteProfile + write rate limit)
**Auth**: any trip member with complete profile

```typescript
// shared/schemas/invitation.ts
export const updateMySettingsSchema = z.object({
  sharePhone: z.boolean(),
});

export const mySettingsResponseSchema = z.object({
  success: z.literal(true),
  sharePhone: z.boolean(),
});

// Response
{ success: true, sharePhone: boolean }
```

Service method `updateMySettings(userId, tripId, sharePhone)`: update `members.share_phone`, return new value. Throw `PermissionDeniedError` if not a member.

### Updated: `GET /trips/:tripId/members`

**Service**: `apps/api/src/services/invitation.service.ts:548` `getTripMembers()`

Changes to query and response mapping:
1. Add `sharePhone: members.sharePhone` to select fields
2. Fetch trip's `showAllMembers` via `db.select({ showAllMembers: trips.showAllMembers }).from(trips).where(eq(trips.id, tripId)).limit(1)`
3. **Member filtering**: when `!isOrg && !trip[0].showAllMembers`, filter results to only `going` + `maybe` status
4. **Phone filtering**: include `phoneNumber` when `isOrg || r.sharePhone` (replaces current `isOrg`-only check)
5. Include `sharePhone` in response when viewer is organizer

### Updated: `GET /trips/:id`

**Service**: `apps/api/src/services/trip.service.ts:311` `getTripById()`

Changes:
1. Conditionally include `phoneNumber` in organizer objects only when `userIsOrganizer`:
```typescript
organizers: organizerUsers.map(u => ({
  id: u.id,
  displayName: u.displayName,
  ...(userIsOrganizer ? { phoneNumber: u.phoneNumber } : {}),
  profilePhotoUrl: u.profilePhotoUrl,
  timezone: u.timezone,
})),
```
2. Include `showAllMembers` in full (non-preview) response

### Updated: `PUT /trips/:id`

Trip update already accepts any field from `updateTripSchema`. Adding `showAllMembers` to the schema is sufficient — the `updateTrip()` service method uses `...data` spread, so it will handle the new field automatically.

## Shared Schemas & Types

### `shared/schemas/invitation.ts`

- Extend `updateRsvpSchema`: add `sharePhone: z.boolean().optional()`
- Add `updateMySettingsSchema` and `mySettingsResponseSchema`
- Export new schemas and `UpdateMySettingsInput` type

### `shared/schemas/trip.ts`

- Add `showAllMembers: z.boolean().default(false)` to `baseTripSchema` (line 69, after `allowMembersToAddEvents`)
- Make `phoneNumber` optional in `organizerDetailSchema` (line 187): `.string()` → `.string().optional()`
- Add `showAllMembers: z.boolean()` to `tripEntitySchema` (line 155, after `allowMembersToAddEvents`)

### `shared/schemas/index.ts`

- Export `updateMySettingsSchema`, `mySettingsResponseSchema`, `UpdateMySettingsInput` from invitation re-exports

### `shared/types/invitation.ts`

- Add `sharePhone?: boolean` to `MemberWithProfile` interface (line 34, after `isMuted`)

### `shared/types/trip.ts`

- Make `phoneNumber` optional in `TripDetail.organizers`: `phoneNumber?: string` (line 84)
- Add `showAllMembers: boolean` to `Trip` interface (line 27, after `allowMembersToAddEvents`)

## FE Components

### New: `apps/web/src/components/icons/venmo-icon.tsx`

Inline SVG of Venmo V logo mark:
```typescript
interface VenmoIconProps { className?: string }

export function VenmoIcon({ className }: VenmoIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* Venmo V path */}
    </svg>
  );
}
```

### Updated: `apps/web/src/components/trip/members-list.tsx`

1. **Venmo icon**: Replace text "Venmo" link (lines 200-210) with `<VenmoIcon className="w-4 h-4" />` inside `<a>` tag. Keep href and target unchanged.
2. **Padding**: Remove `first:pt-0 last:pb-0` from row className (line 168). Keep `py-3`.
3. **Phone display**: Change condition from `isOrganizer && member.phoneNumber` (line 224) to just `member.phoneNumber` — API now handles the filtering.

### Updated: `apps/web/src/components/trip/member-onboarding-wizard.tsx`

Insert new **Step 0** (phone sharing) before existing arrival step:

- New state: `const [sharePhone, setSharePhone] = useState(false)`
- Step 0 content: `Switch` component with label "Share your phone number" and description "Other members will be able to see your phone number for this trip. Organizers can always see it."
- All existing steps shift by +1: arrival=1, departure=2, activities=3, done=last
- `totalSteps` increases by 1 (was `canAddEvents ? 4 : 3`, becomes `canAddEvents ? 5 : 4`)
- On completion, pass `sharePhone` via the RSVP mutation (extend existing `useUpdateRsvp` call to include `sharePhone`) or call my-settings endpoint

### Updated: `apps/web/src/components/notifications/notification-preferences.tsx`

Add "Privacy" section below existing notification switches:
- `<Separator />` after last notification preference
- "Privacy" heading (`<p className="text-sm font-medium mt-4 mb-2">`)
- `Switch` for "Share phone number" with description "Allow other members to see your phone number for this trip"
- Wire to `useMySettings(tripId)` for initial value and `useUpdateMySettings(tripId)` for toggle
- Accept `tripId` prop (already present)

### Updated: `apps/web/src/components/trip/edit-trip-dialog.tsx`

Add `showAllMembers` Checkbox (same pattern as `allowMembersToAddEvents` at lines 355-382):
- Add to `defaultValues` (line 86): `showAllMembers: false`
- Add to `form.reset()` (line 100): `showAllMembers: trip.showAllMembers`
- New `FormField` with Checkbox, label "Show all invited members", description "Let members see everyone invited, not just those going or maybe"
- Place after `allowMembersToAddEvents` field

### New hooks: `apps/web/src/hooks/use-invitations.ts`

```typescript
export function useMySettings(tripId: string) {
  return useQuery({
    queryKey: ["trips", tripId, "my-settings"],
    queryFn: () => api.get(`/trips/${tripId}/my-settings`),
    // enabled when tripId exists
  });
}

export function useUpdateMySettings(tripId: string) {
  return useMutation({
    mutationFn: (data: { sharePhone: boolean }) =>
      api.patch(`/trips/${tripId}/my-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips", tripId, "my-settings"] });
    },
  });
}
```

Follow patterns from existing hooks in the same file (e.g., `useMembers`, `useUpdateRsvp`).

## Testing Strategy

**Unit tests (Vitest)** — written WITH each implementation task:
- `apps/web/src/components/trip/__tests__/members-list.test.tsx` — Venmo icon, phone conditional, padding
- `apps/web/src/components/trip/__tests__/member-onboarding-wizard.test.tsx` — Step 0, navigation, sharePhone state
- `apps/web/src/components/notifications/__tests__/notification-preferences.test.tsx` — Privacy section, switch
- `apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx` — showAllMembers checkbox
- `apps/web/src/hooks/__tests__/use-invitations.test.tsx` — new hooks

**No new E2E tests** — privacy filtering is best tested at unit level. Existing E2E covers member flows.

**Code quality** — every task: `pnpm typecheck`, `pnpm lint`, relevant test file
