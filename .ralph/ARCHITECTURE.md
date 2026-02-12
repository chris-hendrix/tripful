# Phase 5.5: User Profile & Auth Redirects

User profile management page, auth redirect improvements, and dashboard-to-trips route rename. Enables users to edit their profile (name, photo, timezone) and prevents authenticated users from re-entering the login flow.

## Overview

Three interconnected changes:

1. **Auth redirects** — Server-side cookie checks on landing page (`/`) and auth layout redirect authenticated users to `/trips`
2. **Route rename** — Move `/dashboard` to `/trips` across all code, tests, and E2E
3. **Profile page** — New `/profile` page with display name editing, profile photo upload/removal, and timezone selection with auto-detect support

## DB Schema Changes

### Make `timezone` nullable

The `users.timezone` column changes from `NOT NULL DEFAULT 'UTC'` to nullable. `NULL` = auto-detect (resolved to browser timezone on the client).

**File**: `apps/api/src/db/schema/index.ts`

```typescript
// BEFORE
timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),

// AFTER
timezone: varchar("timezone", { length: 100 }),
```

**Migration**: `ALTER TABLE users ALTER COLUMN timezone DROP NOT NULL; ALTER TABLE users ALTER COLUMN timezone DROP DEFAULT;`

### Add `handles` JSONB column

New column on `users` table for social handles (Venmo, Instagram). Stored as JSON object with platform keys.

**File**: `apps/api/src/db/schema/index.ts`

```typescript
handles: jsonb("handles").$type<Record<string, string>>(),
```

Currently allowed platforms: `venmo`, `instagram`. The schema validates allowed keys while the DB stores arbitrary JSON for future extensibility.

### No new tables

Profile photo uses existing `profilePhotoUrl` column on `users` table. No new tables required.

## Shared Schema Changes

### Update `userResponseSchema`

**File**: `shared/schemas/auth.ts`

```typescript
// BEFORE
timezone: z.string(),

// AFTER
timezone: z.string().nullable(),
```

### Update `User` type

**File**: `shared/types/user.ts`

```typescript
// BEFORE
timezone: string;

// AFTER
timezone: string | null;
```

### New `updateProfileSchema`

**File**: `shared/schemas/user.ts` (new file)

```typescript
export const ALLOWED_HANDLE_PLATFORMS = ["venmo", "instagram"] as const;
export type HandlePlatform = (typeof ALLOWED_HANDLE_PLATFORMS)[number];

export const userHandlesSchema = z
  .record(z.string(), z.string().max(100))
  .refine(
    (obj) =>
      Object.keys(obj).every((k) =>
        ALLOWED_HANDLE_PLATFORMS.includes(k as HandlePlatform),
      ),
    { message: "Only venmo and instagram handles are supported" },
  )
  .optional()
  .nullable();

export const updateProfileSchema = z.object({
  displayName: z.string().min(3).max(50).optional(),
  timezone: z.string().nullable().optional(), // null = auto-detect, string = specific IANA tz
  handles: userHandlesSchema,
});
```

### Update `User` type for handles

**File**: `shared/types/user.ts`

```typescript
// ADD
handles: Record<string, string> | null;
```

### Update `userResponseSchema` for handles

**File**: `shared/schemas/auth.ts`

```typescript
// ADD to userResponseSchema
handles: z.record(z.string(), z.string()).nullable().optional(),
```

### Update `MemberWithProfile` for handles

**File**: `shared/types/invitation.ts`

```typescript
// ADD to MemberWithProfile interface
handles: Record<string, string> | null;
```

**File**: `shared/schemas/invitation.ts`

```typescript
// ADD to memberWithProfileSchema
handles: z.record(z.string(), z.string()).nullable().optional(),
```

### Update `completeProfileSchema`

**File**: `shared/schemas/auth.ts`

Allow `timezone` to be `null` (auto-detect):

```typescript
// BEFORE
timezone: z.string().optional(),

// AFTER
timezone: z.string().nullable().optional(),
```

### Barrel exports

**File**: `shared/schemas/index.ts` — add `export * from "./user.js";`

## API: New User Routes

### Route file: `apps/api/src/routes/user.routes.ts`

Register at prefix `/api/users` in `apps/api/src/app.ts`.

#### `PUT /api/users/me` — Update profile

- **Auth**: Required (JWT cookie)
- **Body**: `{ displayName?: string, timezone?: string | null, handles?: Record<string, string> | null }`
- **Response**: `{ success: true, user: User }`
- **Logic**: Calls `authService.updateProfile()` with updated fields. If `displayName` changes, regenerate JWT (since JWT payload includes `name`). If only timezone changes, no JWT refresh needed.

#### `POST /api/users/me/photo` — Upload profile photo

- **Auth**: Required (JWT cookie)
- **Body**: Multipart form data with `file` field
- **Response**: `{ success: true, user: User }`
- **Logic**: Follow trip cover image upload pattern:
  1. `await request.file()` to get multipart data
  2. `await data.toBuffer()` to get buffer
  3. `uploadService.validateImage()` + `uploadService.uploadImage()`
  4. If user has existing photo, `uploadService.deleteImage()` to clean up old file
  5. Update user's `profilePhotoUrl` in DB

#### `DELETE /api/users/me/photo` — Remove profile photo

- **Auth**: Required (JWT cookie)
- **Response**: `{ success: true, user: User }`
- **Logic**: Delete file via `uploadService.deleteImage()`, set `profilePhotoUrl` to `null` in DB.

### Service changes

**File**: `apps/api/src/services/auth.service.ts`

Extend `updateProfile()` to accept `profilePhotoUrl`:

```typescript
// BEFORE
async updateProfile(userId: string, data: { displayName?: string; timezone?: string })

// AFTER
async updateProfile(userId: string, data: { displayName?: string; timezone?: string | null; profilePhotoUrl?: string | null; handles?: Record<string, string> | null })
```

### Controller: `apps/api/src/controllers/user.controller.ts` (new file)

Three methods: `updateProfile`, `uploadProfilePhoto`, `removeProfilePhoto`.

Pattern follows `apps/api/src/controllers/trip.controller.ts` for the multipart upload handling.

## Frontend: Auth Redirects

### Landing page redirect

**File**: `apps/web/src/app/page.tsx`

Convert to async server component. Check for `auth_token` cookie, redirect to `/trips` if present:

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");
  if (authToken?.value) {
    redirect("/trips");
  }
  // ... existing landing page JSX
}
```

### Auth layout redirect

**File**: `apps/web/src/app/(auth)/layout.tsx`

Add server-side cookie check. Redirect authenticated users to `/trips`:

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");
  if (authToken?.value) {
    redirect("/trips");
  }
  // ... existing layout JSX
}
```

## Frontend: Dashboard to /trips Rename

### File move

Move `apps/web/src/app/(app)/dashboard/` → merge into `apps/web/src/app/(app)/trips/`

The trips list page lives at `(app)/trips/page.tsx` and individual trip pages at `(app)/trips/[id]/page.tsx`.

### Files in dashboard directory

- `page.tsx` → move to `(app)/trips/page.tsx`
- `dashboard-content.tsx` → rename to `trips-content.tsx`, move to `(app)/trips/`
- `dashboard-content.test.tsx` → rename to `trips-content.test.tsx`, move to `(app)/trips/`
- `page.test.tsx` → move to `(app)/trips/page.test.tsx`
- `loading.tsx` → move to `(app)/trips/loading.tsx`

### Reference updates (all `/dashboard` → `/trips`)

**Source files** (~10 files):

- `apps/web/src/app/(auth)/verify/page.tsx` — `router.push("/trips")`
- `apps/web/src/app/(auth)/complete-profile/page.tsx` — `router.push("/trips")`
- `apps/web/src/app/(app)/trips/[id]/not-found.tsx` — `href="/trips"`
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — breadcrumb links
- `apps/web/src/components/app-header.tsx` — wordmark href, nav link text ("My Trips"), pathname check
- `apps/web/src/hooks/use-trips.ts` — `router.push("/trips")`
- `apps/web/src/app/robots.ts` — disallow list (remove `/dashboard`, keep `/trips`)

**Test files** (~5 files):

- `apps/web/src/app/(auth)/verify/page.test.tsx`
- `apps/web/src/app/(auth)/complete-profile/page.test.tsx`
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.test.tsx`
- `apps/web/src/components/__tests__/app-header.test.tsx`

**E2E tests** (~2 files):

- `apps/web/tests/e2e/auth-journey.spec.ts`
- `apps/web/tests/e2e/trip-journey.spec.ts`

### Nav update

**File**: `apps/web/src/components/app-header.tsx`

- Wordmark link: `/dashboard` → `/trips`
- Nav link: "Dashboard" → "My Trips", href `/trips`
- Active state check: `pathname.startsWith("/trips")`

## Frontend: Profile Page

### New page: `apps/web/src/app/(app)/profile/page.tsx`

Server component wrapper (within `(app)` layout, so auth is already checked).

### New component: `apps/web/src/components/profile/profile-form.tsx`

Client component with React Hook Form + Zod validation.

**Fields:**

- **Profile photo**: Circular avatar preview with upload/remove buttons. Reuse `ImageUpload` pattern (FormData multipart upload). Shows current photo or initials fallback.
- **Display name**: Text input (3-50 chars). Pre-filled with current value.
- **Phone number**: Read-only display.
- **Timezone**: Select dropdown with "Auto-detect" as first option. When "Auto-detect" is selected, send `timezone: null` to API.
- **Handles**: Two text inputs for Venmo and Instagram usernames. Optional. Saved as part of `PUT /api/users/me` body. Show platform icons/labels next to inputs.

**Timezone dropdown behavior:**

- First option: "Auto-detect (detected: America/New_York)" — label dynamically shows detected timezone, value maps to `null` on submit
- Remaining options: Standard IANA timezone list from `TIMEZONES` constant
- Default selection: If `user.timezone` is `null`, select "Auto-detect". Otherwise select the stored timezone.

**API calls:**

- Profile update: `PUT /api/users/me` via TanStack Query mutation
- Photo upload: `POST /api/users/me/photo` via `fetch` with FormData
- Photo remove: `DELETE /api/users/me/photo` via `fetch`
- On success: call `auth.refetch()` to update user state in AuthProvider

### TanStack Query hooks: `apps/web/src/hooks/use-user.ts` (new file)

```typescript
export function useUpdateProfile() {
  /* useMutation for PUT /api/users/me */
}
export function useUploadProfilePhoto() {
  /* useMutation for POST /api/users/me/photo */
}
export function useRemoveProfilePhoto() {
  /* useMutation for DELETE /api/users/me/photo */
}
```

## Frontend: Handles in Members Dialog

### Update members list

**File**: `apps/web/src/components/trip/members-list.tsx`

Show Venmo and Instagram handles on member cards when available. Display as clickable links:

- Venmo: `https://venmo.com/{handle}` (open in new tab)
- Instagram: `https://instagram.com/{handle}` (open in new tab)

Small icon + handle text below the member's name in the members dialog.

### Backend: Include handles in member query

**File**: `apps/api/src/services/invitation.service.ts`

The `getMembers()` query joins with users table — add `handles` to the selected fields so it's included in `MemberWithProfile` responses.

## Frontend: Complete Profile Changes

### Add optional photo upload

**File**: `apps/web/src/app/(auth)/complete-profile/page.tsx`

Add a circular avatar upload area above the display name field. Optional — user can skip. Photo gets uploaded immediately after profile completion (two API calls: complete profile, then upload photo if selected).

### Add "Auto-detect" to timezone dropdown

Same pattern as profile page. Default to "Auto-detect" instead of pre-selecting the detected timezone. When "Auto-detect" is selected, don't send timezone in the request body.

### Update redirect

Change `router.push("/dashboard")` → `router.push("/trips")`

## Frontend: Timezone Auto-detect Resolution

Where `user.timezone` is consumed and might be `null`:

**File**: `apps/web/src/components/itinerary/itinerary-view.tsx`

```typescript
// BEFORE
const userTimezone = user?.timezone || "UTC";

// AFTER
const userTimezone =
  user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
```

Any other place that reads `user.timezone` with a fallback should use the browser timezone instead of "UTC".

## Testing Strategy

### Unit tests

- `user.controller.ts` — test updateProfile, uploadProfilePhoto, removeProfilePhoto
- `auth.service.ts` — test updateProfile with nullable timezone and profilePhotoUrl
- `updateProfileSchema` validation — test all field combinations

### Integration tests

- `PUT /api/users/me` — update displayName, timezone, timezone to null
- `POST /api/users/me/photo` — upload, replace existing, invalid file type, too large
- `DELETE /api/users/me/photo` — remove existing, remove when none exists
- Auth on all endpoints (401 without cookie)

### E2E tests

- Authenticated user visiting `/` redirects to `/trips`
- Authenticated user visiting `/login` redirects to `/trips`
- User can navigate to profile page from header dropdown
- User can edit display name and save
- User can upload and remove profile photo
- Complete-profile page redirects to `/trips`

### Existing test updates

- All E2E tests: `/dashboard` → `/trips`
- All unit tests referencing `/dashboard` → `/trips`
