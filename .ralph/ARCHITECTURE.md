# Architecture: Phase 3 - Trip Management

## Overview

Phase 3 implements full CRUD operations for trip management, enabling users to create, view, edit, and cancel trips. This includes co-organizer management, cover image uploads, and a dashboard with trip listing. The implementation follows the established patterns from Phase 2 (authentication) while introducing new features like file uploads and permissions management.

## Goals

1. **Trip CRUD Operations**: Users can create, read, update, and soft-delete trips
2. **Co-Organizer Management**: Trip creators can add co-organizers who have full management permissions
3. **Image Upload**: Mock file upload service for trip cover images (5MB max, JPG/PNG/WEBP)
4. **Dashboard & Detail Views**: User-friendly interfaces for browsing trips and viewing details
5. **Permissions System**: Service-based authorization for trip operations
6. **Comprehensive Testing**: Unit, integration, and E2E tests matching Phase 2 quality standards

## System Architecture

### Backend Components

#### 1. Trip Service (`apps/api/src/services/trip.service.ts`)

**Interface:**

```typescript
export interface ITripService {
  // CRUD operations
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>;
  getTripById(tripId: string, userId: string): Promise<Trip | null>;
  getUserTrips(userId: string): Promise<TripSummary[]>;
  updateTrip(
    tripId: string,
    userId: string,
    data: UpdateTripInput,
  ): Promise<Trip>;
  cancelTrip(tripId: string, userId: string): Promise<void>;

  // Co-organizer management
  addCoOrganizers(
    tripId: string,
    userId: string,
    phoneNumbers: string[],
  ): Promise<void>;
  removeCoOrganizer(
    tripId: string,
    userId: string,
    coOrgUserId: string,
  ): Promise<void>;
  getCoOrganizers(tripId: string): Promise<User[]>;

  // Member management
  getTripMembers(tripId: string): Promise<Member[]>;
  getMemberCount(tripId: string): Promise<number>;
}
```

**Key Methods:**

- `createTrip`: Creates trip record, adds creator as member with RSVP='going', handles co-organizers
- `getTripById`: Returns full trip details with organizers and member count
- `getUserTrips`: Returns trip summaries for dashboard (upcoming/past, with filters)
- `updateTrip`: Updates trip details after permission check
- `cancelTrip`: Soft delete (sets `cancelled: true`)
- `addCoOrganizers`: Validates phone numbers, creates member records, enforces 25-member limit
- `getMemberCount`: Counts non-cancelled members for limit enforcement

#### 2. Permissions Service (`apps/api/src/services/permissions.service.ts`)

**Interface:**

```typescript
export interface IPermissionsService {
  canEditTrip(userId: string, tripId: string): Promise<boolean>;
  canDeleteTrip(userId: string, tripId: string): Promise<boolean>;
  canManageCoOrganizers(userId: string, tripId: string): Promise<boolean>;
  isOrganizer(userId: string, tripId: string): Promise<boolean>;
  isMember(userId: string, tripId: string): Promise<boolean>;
}
```

**Authorization Logic:**

- **Edit/Delete Trip**: Creator OR co-organizer (member with RSVP='going' AND userId in trip.createdBy or members.userId where member joined at creation)
- **Manage Co-Organizers**: Creator OR existing co-organizer
- **View Trip**: Must be a member (non-cancelled member record exists)

**Implementation Approach:**

- Query members table to check relationships
- Cache results during request lifecycle (consider future optimization)
- Reusable across all trip-related routes

#### 3. Upload Service (`apps/api/src/services/upload.service.ts`)

**Interface:**

```typescript
export interface IUploadService {
  uploadImage(
    file: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<string>;
  deleteImage(url: string): Promise<void>;
  validateImage(file: Buffer, mimetype: string): Promise<void>;
}
```

**Implementation Details:**

- **Storage**: Local filesystem in `apps/api/uploads/` (gitignored)
- **Validation**: Max 5MB, MIME types: `image/jpeg`, `image/png`, `image/webp`
- **URL Pattern**: `/uploads/{uuid}.{ext}` (e.g., `/uploads/123e4567-e89b-12d3-a456-426614174000.jpg`)
- **Serving**: Static file endpoint `GET /uploads/:filename`
- **Future-Proof**: Abstract interface allows swapping in S3/CloudFlare without changing consumers

**Validation:**

```typescript
async validateImage(file: Buffer, mimetype: string): Promise<void> {
  // Check MIME type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed');
  }

  // Check file size (5MB)
  if (file.length > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB. Please choose a smaller file');
  }
}
```

#### 4. Trip Controller (`apps/api/src/controllers/trip.controller.ts`)

**Endpoints:**

```typescript
// CRUD operations
POST   /trips              - Create trip (with optional co-organizers)
GET    /trips              - List user's trips (upcoming/past)
GET    /trips/:id          - Get trip details
PUT    /trips/:id          - Update trip
DELETE /trips/:id          - Cancel trip (soft delete)

// Co-organizer management
POST   /trips/:id/co-organizers      - Add co-organizers
DELETE /trips/:id/co-organizers/:userId - Remove co-organizer

// Image upload
POST   /trips/:id/cover-image  - Upload cover image
DELETE /trips/:id/cover-image  - Delete cover image

// Static file serving
GET    /uploads/:filename     - Serve uploaded images
```

**Request/Response Examples:**

**POST /trips**

```json
// Request
{
  "name": "Bachelor Party in Miami",
  "destination": "Miami Beach, FL",
  "startDate": "2026-10-12",
  "endDate": "2026-10-14",
  "timezone": "America/New_York",
  "description": "Epic weekend celebration",
  "coverImageUrl": null,
  "allowMembersToAddEvents": true,
  "coOrganizerPhones": ["+15551234567"]
}

// Response (201 Created)
{
  "id": "uuid",
  "name": "Bachelor Party in Miami",
  "destination": "Miami Beach, FL",
  "startDate": "2026-10-12",
  "endDate": "2026-10-14",
  "preferredTimezone": "America/New_York",
  "description": "Epic weekend celebration",
  "coverImageUrl": null,
  "createdBy": "userId",
  "allowMembersToAddEvents": true,
  "cancelled": false,
  "createdAt": "2026-02-04T...",
  "updatedAt": "2026-02-04T..."
}
```

**GET /trips**

```json
// Response (200 OK)
{
  "trips": [
    {
      "id": "uuid",
      "name": "Bachelor Party in Miami",
      "destination": "Miami Beach, FL",
      "startDate": "2026-10-12",
      "endDate": "2026-10-14",
      "coverImageUrl": "/uploads/abc123.jpg",
      "isOrganizer": true,
      "rsvpStatus": "going",
      "organizerInfo": [
        { "id": "uuid", "displayName": "Mike Johnson", "profilePhotoUrl": null }
      ],
      "memberCount": 5,
      "eventCount": 0
    }
  ]
}
```

**GET /trips/:id**

```json
// Response (200 OK)
{
  "id": "uuid",
  "name": "Bachelor Party in Miami",
  "destination": "Miami Beach, FL",
  "startDate": "2026-10-12",
  "endDate": "2026-10-14",
  "preferredTimezone": "America/New_York",
  "description": "Epic weekend celebration",
  "coverImageUrl": "/uploads/abc123.jpg",
  "createdBy": "userId",
  "allowMembersToAddEvents": true,
  "cancelled": false,
  "organizers": [
    { "id": "uuid", "displayName": "Mike Johnson", "phoneNumber": "+15551234567" }
  ],
  "members": [...],
  "memberCount": 5,
  "eventCount": 0,
  "createdAt": "2026-02-04T...",
  "updatedAt": "2026-02-04T..."
}
```

**Error Responses:**

- `400 Bad Request`: Validation errors (name too short, invalid dates, etc.)
- `401 Unauthorized`: Missing or invalid auth token
- `403 Forbidden`: User lacks permission (can't edit/delete trip)
- `404 Not Found`: Trip doesn't exist or user not a member
- `409 Conflict`: Member limit exceeded (25 max)

#### 5. Database Schema Usage

**Trips Table** (already defined in ARCHITECTURE.md):

```typescript
{
  id: uuid (PK),
  name: varchar(100) NOT NULL,
  destination: text NOT NULL,
  startDate: date,
  endDate: date,
  preferredTimezone: varchar(100) NOT NULL,
  description: text,
  coverImageUrl: text,
  createdBy: uuid (FK to users),
  allowMembersToAddEvents: boolean DEFAULT true,
  cancelled: boolean DEFAULT false,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Members Table** (already defined):

```typescript
{
  id: uuid (PK),
  tripId: uuid (FK to trips, CASCADE),
  userId: uuid (FK to users, CASCADE),
  status: enum('going', 'maybe', 'not_going', 'no_response') DEFAULT 'no_response',
  updatedAt: timestamp,
  createdAt: timestamp
}
```

**Member Creation Logic:**

1. When trip is created:
   - Insert member record for creator: `{ tripId, userId: createdBy, status: 'going' }`
   - For each co-organizer phone number:
     - Look up user by phone
     - If found: Insert member record with `status: 'going'`
     - If not found: Return error (co-organizer must have account)

2. Member limit enforcement:
   - Before adding co-organizers, count existing members: `SELECT COUNT(*) FROM members WHERE tripId = ?`
   - If `count + new_co_organizers.length > 25`, reject with `409 Conflict`

**Queries:**

```typescript
// Create trip with creator as member
const trip = await db.insert(trips).values(tripData).returning();
await db.insert(members).values({
  tripId: trip.id,
  userId: createdBy,
  status: "going",
});

// Get trip with organizers
const result = await db
  .select({
    trip: trips,
    creator: users,
    coOrgs: sql`json_agg(DISTINCT ${users})`, // Get all organizers
  })
  .from(trips)
  .leftJoin(users, eq(trips.createdBy, users.id))
  .leftJoin(
    members,
    and(eq(members.tripId, trips.id), eq(members.status, "going")),
  )
  .where(eq(trips.id, tripId));

// Check if user is organizer (creator or co-org with 'going' status)
const isOrganizer = await db
  .select()
  .from(trips)
  .leftJoin(
    members,
    and(
      eq(members.tripId, trips.id),
      eq(members.userId, userId),
      eq(members.status, "going"),
    ),
  )
  .where(
    and(
      eq(trips.id, tripId),
      or(eq(trips.createdBy, userId), eq(members.userId, userId)),
    ),
  );
```

### Frontend Components

#### 1. Dashboard Page (`apps/web/src/app/(app)/dashboard/page.tsx`)

**Replaces Current Simple Dashboard:**

- Redesign with demo aesthetic (Playfair Display font, gradient accents)
- Two sections: "Upcoming trips" and "Past trips"
- Trip cards showing: cover image, name, destination, dates, organizer avatars, RSVP badge, event count
- Floating Action Button (FAB) for "Create Trip" (fixed bottom-right)
- Search bar in header
- Empty states with CTA

**UI Structure:**

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/30">
  <header>
    <h1>My Trips</h1>
    <SearchBar />
  </header>

  <section>
    <h2>Upcoming trips</h2>
    {upcomingTrips.map((trip) => (
      <TripCard trip={trip} />
    ))}
  </section>

  <section>
    <h2>Past trips</h2>
    {pastTrips.map((trip) => (
      <TripCard trip={trip} />
    ))}
  </section>

  <FloatingActionButton onClick={openCreateDialog} />
  <CreateTripDialog open={isOpen} onClose={closeDialog} />
</div>
```

**Data Fetching:**

```tsx
const { data: trips, isLoading } = useQuery({
  queryKey: ["trips"],
  queryFn: () => fetch("/api/trips").then((r) => r.json()),
});

const upcomingTrips = trips?.filter((t) => new Date(t.startDate) >= new Date());
const pastTrips = trips?.filter((t) => new Date(t.startDate) < new Date());
```

#### 2. Create Trip Dialog (`apps/web/src/components/trip/create-trip-dialog.tsx`)

**Dialog Component (shadcn Dialog):**

- Multi-step form (Step 1: Basic info, Step 2: Optional details & co-organizers)
- Progress indicator (Step 1 of 2, Step 2 of 2)
- Form fields match demo design:
  - Trip name (required, 3-100 chars)
  - Destination (required)
  - Start/End dates (optional, grid layout)
  - Timezone select (required, defaults to user's timezone)
  - Description (optional, 2000 char max, textarea)
  - Cover image upload (optional, 5MB max)
  - "Allow members to add events" checkbox (default checked)
  - Co-organizer phone numbers (optional, multi-input)

**Validation:**

- Real-time validation with Zod schema
- Display inline errors
- Disable submit until valid

**Form Submission:**

```tsx
const createTripMutation = useMutation({
  mutationFn: (data: CreateTripInput) =>
    fetch("/api/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  onSuccess: (newTrip) => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    router.push(`/trips/${newTrip.id}`);
  },
});
```

**Optimistic Updates:**

```tsx
const createTripMutation = useMutation({
  mutationFn: createTrip,
  onMutate: async (newTrip) => {
    await queryClient.cancelQueries({ queryKey: ["trips"] });
    const previousTrips = queryClient.getQueryData(["trips"]);

    queryClient.setQueryData(["trips"], (old) => [
      ...old,
      {
        ...newTrip,
        id: "temp-id",
        isOptimistic: true,
      },
    ]);

    return { previousTrips };
  },
  onError: (err, newTrip, context) => {
    queryClient.setQueryData(["trips"], context.previousTrips);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
  },
});
```

#### 3. Trip Detail Page (`apps/web/src/app/(app)/trips/[id]/page.tsx`)

**Layout:**

- Cover image hero section (if available)
- Trip header: name, destination, dates, organizer info
- RSVP badge (Going/Maybe/Not Going/No Response)
- Event count (placeholder - no events until Phase 5)
- Settings button (organizers only) → Opens edit dialog
- Empty state: "No events yet. Events coming in Phase 5!"

**Access Control:**

```tsx
const { data: trip, error } = useQuery({
  queryKey: ["trips", id],
  queryFn: () =>
    fetch(`/api/trips/${id}`).then((r) => {
      if (r.status === 404) throw new Error("Trip not found");
      if (r.status === 403)
        throw new Error("You do not have access to this trip");
      return r.json();
    }),
});

if (
  error?.message === "Trip not found" ||
  error?.message === "You do not have access to this trip"
) {
  return <ErrorPage message={error.message} />;
}
```

#### 4. Edit Trip Dialog (`apps/web/src/components/trip/edit-trip-dialog.tsx`)

**Similar to Create Dialog:**

- Pre-populated with current trip data
- Same validation rules
- Additional features:
  - Manage co-organizers (add/remove)
  - Delete/Cancel trip button (confirmation required)

**Update Mutation:**

```tsx
const updateTripMutation = useMutation({
  mutationFn: ({ id, data }) =>
    fetch(`/api/trips/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  onMutate: async ({ id, data }) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ["trips", id] });
    const previousTrip = queryClient.getQueryData(["trips", id]);
    queryClient.setQueryData(["trips", id], { ...previousTrip, ...data });
    return { previousTrip };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(["trips", variables.id], context.previousTrip);
  },
  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries({ queryKey: ["trips", variables.id] });
    queryClient.invalidateQueries({ queryKey: ["trips"] });
  },
});
```

#### 5. Image Upload Component (`apps/web/src/components/trip/image-upload.tsx`)

**UI:**

- Drag-and-drop zone or file input
- Preview uploaded image
- Validation: 5MB max, JPG/PNG/WEBP only
- Loading state during upload
- Error display

**Upload Logic:**

```tsx
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`/api/trips/${tripId}/cover-image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { url } = await response.json();
  return url;
};

const { mutate: uploadCoverImage, isLoading } = useMutation({
  mutationFn: uploadImage,
  onSuccess: (url) => {
    // Update form state or trip data
    setValue("coverImageUrl", url);
  },
  onError: (error) => {
    setError(error.message);
  },
});
```

### Shared Schemas (`shared/schemas/trip.ts`)

**Trip Validation Schemas:**

```typescript
import { z } from "zod";

// Timezone validation using IANA timezone database
const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  // ... full IANA list
];

export const createTripSchema = z
  .object({
    name: z
      .string()
      .min(3, "Trip name must be at least 3 characters")
      .max(100, "Trip name must not exceed 100 characters"),
    destination: z.string().min(1, "Destination is required"),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timezone: z.enum(timezones, {
      errorMap: () => ({ message: "Invalid timezone" }),
    }),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    coverImageUrl: z.string().url().optional().nullable(),
    allowMembersToAddEvents: z.boolean().default(true),
    coOrganizerPhones: z.array(z.string().min(10).max(20)).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const updateTripSchema = createTripSchema.partial();

export const addCoOrganizerSchema = z.object({
  phoneNumbers: z
    .array(z.string().min(10).max(20))
    .min(1, "At least one phone number required"),
});

// Type inference
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddCoOrganizerInput = z.infer<typeof addCoOrganizerSchema>;
```

## Technical Decisions

### 1. Soft Delete vs Hard Delete

- **Decision**: Soft delete only (set `cancelled: true`)
- **Rationale**: Preserves data for audit trails, allows potential restoration, prevents cascade deletions of events/members

### 2. Co-Organizer Model

- **Decision**: Co-organizers are members with `status='going'` + special logic to distinguish from regular members
- **Alternative Considered**: Separate `trip_organizers` table
- **Rationale**: Reuses existing members table, simpler schema, co-organizers should RSVP'd anyway

### 3. Image Upload Approach

- **Decision**: Mock local storage service with interface allowing future S3 swap
- **Rationale**: Keeps Phase 3 focused, provides working feature, easy to replace later
- **Trade-offs**: Local storage not suitable for production, but good for MVP

### 4. Permissions Architecture

- **Decision**: Dedicated PermissionsService rather than inline checks
- **Rationale**: Reusable logic, testable in isolation, single source of truth for authorization rules

### 5. Frontend State Management

- **Decision**: TanStack Query with optimistic updates
- **Rationale**: Matches Phase 2 patterns, better UX with instant feedback, handles caching/invalidation

### 6. Member Limit Enforcement

- **Decision**: Enforce 25-member limit at API level, count includes creator + co-organizers
- **Rationale**: Prevents data integrity issues, matches PRD spec, server-side validation is authoritative

## File Structure

```
apps/api/src/
├── controllers/
│   └── trip.controller.ts           # Trip CRUD endpoints
├── services/
│   ├── trip.service.ts              # Trip business logic
│   ├── permissions.service.ts       # Authorization logic
│   └── upload.service.ts            # File upload handling
├── routes/
│   └── trip.routes.ts               # Trip route registration
├── middleware/
│   └── permissions.middleware.ts    # Permission check middleware (optional)
└── uploads/                         # Local image storage (gitignored)

apps/web/src/
├── app/(app)/
│   ├── dashboard/
│   │   └── page.tsx                 # Redesigned dashboard with trip list
│   └── trips/
│       └── [id]/
│           └── page.tsx             # Trip detail view
├── components/trip/
│   ├── create-trip-dialog.tsx       # Create trip modal
│   ├── edit-trip-dialog.tsx         # Edit trip modal
│   ├── trip-card.tsx                # Trip card component
│   └── image-upload.tsx             # Image upload component
└── hooks/
    └── use-trips.ts                 # Trip-related React Query hooks

shared/
└── schemas/
    └── trip.ts                      # Trip validation schemas

apps/api/tests/
├── unit/
│   ├── trip.service.test.ts         # Trip service unit tests
│   ├── permissions.service.test.ts  # Permissions service tests
│   └── upload.service.test.ts       # Upload service tests
└── integration/
    └── trip.routes.test.ts          # Trip API integration tests

apps/web/tests/e2e/
└── trip-flow.spec.ts                # E2E test: Create & view trip
```

## Testing Strategy

### Unit Tests (Vitest)

**Trip Service Tests:**

- `createTrip`: Creates trip with creator as member
- `createTrip` with co-organizers: Validates phones, creates member records
- `createTrip`: Enforces 25-member limit
- `getTripById`: Returns trip with organizers and member count
- `getUserTrips`: Filters upcoming/past trips correctly
- `updateTrip`: Updates trip details
- `cancelTrip`: Sets cancelled flag
- `addCoOrganizers`: Validates existing users, enforces limit
- `removeCoOrganizer`: Removes member record

**Permissions Service Tests:**

- `canEditTrip`: Returns true for creator
- `canEditTrip`: Returns true for co-organizer
- `canEditTrip`: Returns false for non-organizer
- `canDeleteTrip`: Same as edit permissions
- `isOrganizer`: Correctly identifies organizers
- `isMember`: Checks member table

**Upload Service Tests:**

- `validateImage`: Accepts valid JPG/PNG/WEBP
- `validateImage`: Rejects files over 5MB
- `validateImage`: Rejects invalid MIME types
- `uploadImage`: Saves to uploads directory
- `deleteImage`: Removes file from disk

### Integration Tests (Vitest + Supertest)

**Trip Routes Tests:**

- `POST /trips`: Creates trip, returns 201 with trip data
- `POST /trips`: Returns 400 for invalid data (name too short, dates invalid)
- `POST /trips`: Returns 401 without auth token
- `POST /trips`: Creates member record for creator
- `POST /trips` with co-organizers: Creates member records for co-organizers
- `POST /trips`: Returns 409 when exceeding member limit
- `GET /trips`: Returns user's trips (upcoming/past)
- `GET /trips`: Returns empty array for user with no trips
- `GET /trips/:id`: Returns trip details
- `GET /trips/:id`: Returns 404 for non-existent trip
- `GET /trips/:id`: Returns 403 for non-member
- `PUT /trips/:id`: Updates trip
- `PUT /trips/:id`: Returns 403 for non-organizer
- `DELETE /trips/:id`: Soft deletes trip
- `DELETE /trips/:id`: Returns 403 for non-organizer
- `POST /trips/:id/co-organizers`: Adds co-organizers
- `POST /trips/:id/co-organizers`: Returns 400 for non-existent user
- `DELETE /trips/:id/co-organizers/:userId`: Removes co-organizer

### E2E Tests (Playwright)

**Test Scenario 1: Create and View Trip**

```typescript
test("user can create a trip and view it on dashboard", async ({ page }) => {
  // Login
  await loginUser(page, testPhone);

  // Navigate to dashboard
  await page.goto("/dashboard");

  // Click FAB
  await page.click('[data-testid="create-trip-fab"]');

  // Fill trip form
  await page.fill('input[name="name"]', "Test Trip");
  await page.fill('input[name="destination"]', "Test Destination");
  await page.selectOption('select[name="timezone"]', "America/New_York");

  // Submit
  await page.click('button:has-text("Create Trip")');

  // Verify redirect to trip detail page
  await page.waitForURL("**/trips/**");

  // Verify trip details
  await expect(page.locator('h1:has-text("Test Trip")')).toBeVisible();
  await expect(page.locator("text=Test Destination")).toBeVisible();

  // Go back to dashboard
  await page.goto("/dashboard");

  // Verify trip appears in list
  await expect(page.locator("text=Test Trip")).toBeVisible();
});
```

**Test Scenario 2: Edit Trip as Organizer**

```typescript
test("organizer can edit trip details", async ({ page }) => {
  // Setup: Create trip via API
  const trip = await createTestTrip(testPhone);

  // Login as organizer
  await loginUser(page, testPhone);

  // Navigate to trip detail
  await page.goto(`/trips/${trip.id}`);

  // Click edit button
  await page.click('button:has-text("Edit Trip")');

  // Update trip name
  await page.fill('input[name="name"]', "Updated Trip Name");

  // Submit
  await page.click('button:has-text("Save Changes")');

  // Verify update
  await expect(page.locator('h1:has-text("Updated Trip Name")')).toBeVisible();
});
```

**Test Scenario 3: Upload Cover Image**

```typescript
test("user can upload cover image", async ({ page }) => {
  const trip = await createTestTrip(testPhone);
  await loginUser(page, testPhone);
  await page.goto(`/trips/${trip.id}`);

  // Click edit
  await page.click('button:has-text("Edit Trip")');

  // Upload image
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("tests/fixtures/test-image.jpg");

  // Wait for upload
  await page.waitForSelector('img[src^="/uploads/"]');

  // Submit
  await page.click('button:has-text("Save Changes")');

  // Verify cover image displayed
  await expect(page.locator('img[src^="/uploads/"]')).toBeVisible();
});
```

**Test Scenario 4: Non-Organizer Cannot Edit**

```typescript
test("non-organizer cannot edit trip", async ({ page }) => {
  const trip = await createTestTrip(otherUserPhone);
  await loginUser(page, testPhone);

  // Navigate to trip (not a member)
  await page.goto(`/trips/${trip.id}`);

  // Verify no access
  await expect(
    page.locator("text=You do not have access to this trip"),
  ).toBeVisible();

  // OR if member but not organizer, no edit button
  // await expect(page.locator('button:has-text("Edit Trip")')).not.toBeVisible();
});
```

## Migration Path

### Database Migrations

No new migrations needed - `trips` and `members` tables already exist from demo implementation. Verify schemas match expectations:

```sql
-- Verify trips table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trips';

-- Verify members table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members';
```

If schema changes needed (e.g., adding indexes), generate migration:

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
```

### Backwards Compatibility

Phase 3 introduces new endpoints but doesn't modify existing Phase 2 auth endpoints. No breaking changes expected.

## Environment Configuration

Add to `apps/api/.env`:

```bash
# File upload settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp
```

Add to `apps/api/.gitignore`:

```
/uploads
```

## Dependencies

**Backend:**

- No new dependencies needed (Fastify multipart already available via `@fastify/multipart`)

**Frontend:**

- Consider `react-dropzone` for drag-and-drop image upload (optional)
- All other dependencies already present (TanStack Query, Zod, shadcn/ui)

## Performance Considerations

1. **Image Upload**: Limit concurrent uploads, consider progress indicators
2. **Trip Listing**: Paginate if user has >50 trips (future optimization)
3. **Member Count**: Cache in trips table (future optimization via trigger)
4. **Permissions Checks**: Cache during request lifecycle to avoid duplicate queries

## Security Considerations

1. **Authentication**: All endpoints require JWT auth (reuse Phase 2 middleware)
2. **Authorization**: Permissions service enforces who can edit/delete trips
3. **File Upload**: Validate MIME types server-side (don't trust client)
4. **Path Traversal**: Sanitize filenames, use UUIDs for storage
5. **DOS Prevention**: Rate limit file uploads (consider in future phases)
6. **SQL Injection**: Drizzle ORM provides protection via parameterized queries

## Success Criteria

Phase 3 is complete when:

- [ ] Users can create trips with all required fields
- [ ] Users can add co-organizers during creation or after
- [ ] Cover images can be uploaded (5MB max, JPG/PNG/WEBP)
- [ ] Dashboard displays upcoming and past trips
- [ ] Trip detail page shows full trip information
- [ ] Organizers can edit trip details
- [ ] Organizers can cancel trips (soft delete)
- [ ] Non-organizers cannot edit/delete trips
- [ ] 25-member limit is enforced
- [ ] All unit tests pass (target: 15+ tests)
- [ ] All integration tests pass (target: 20+ tests)
- [ ] All E2E tests pass (target: 4 scenarios)
- [ ] Code coverage >80% for new services

## Out of Scope (Future Phases)

- Trip invitations (Phase 4)
- RSVP management (Phase 4)
- Events and itinerary (Phase 5)
- Member travel and accommodations (Phase 6)
- Real S3/CloudFlare image storage (Post-MVP)
- Trip search and filtering beyond upcoming/past (Post-MVP)
