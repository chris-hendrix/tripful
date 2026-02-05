# Verification: Phase 3 - Trip Management

## Overview

This document describes how to verify Phase 3 implementation through automated tests, manual testing, and environment setup. All verification steps should pass before considering Phase 3 complete.

## Environment Setup

### Prerequisites

- **Node.js**: v22.x (LTS)
- **pnpm**: v9.x
- **PostgreSQL**: 16.x (running via Docker)
- **Docker**: Required for PostgreSQL and GitGuardian pre-commit hook

### Initial Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm docker:up

# Run migrations
cd apps/api
pnpm db:migrate
cd ../..

# Create uploads directory
mkdir -p apps/api/uploads

# Verify environment files exist
ls apps/api/.env apps/web/.env.local
```

### Environment Variables

**apps/api/.env:**
```bash
DATABASE_URL=postgresql://tripful_user:tripful_password@localhost:5433/tripful_db
JWT_SECRET=your-secret-key-minimum-32-characters-long
NODE_ENV=development

# Phase 3: File upload settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp
```

**apps/web/.env.local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Test Credentials

Phase 3 uses the same test pattern as Phase 2:

- **Phone numbers**: Generated dynamically per test (e.g., `+1555${Date.now()}`)
- **Verification code**: `123456` (fixed in development/test environments)
- **Test images**: Located in `apps/web/tests/fixtures/` (must be created)

**Create test fixture image:**
```bash
mkdir -p apps/web/tests/fixtures
# Download or create a test image
wget -O apps/web/tests/fixtures/test-image.jpg "https://picsum.photos/800/600"
```

## Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | Web application |
| Backend (Fastify) | 8000 | REST API |
| PostgreSQL | 5433 (external), 5432 (container) | Database |
| Playwright UI | 9323 | E2E test debugging UI |

## Test Suites

### 1. Unit Tests (Vitest)

**Run all unit tests:**
```bash
cd apps/api
pnpm test:unit
```

**Run specific test file:**
```bash
cd apps/api
pnpm vitest tests/unit/trip.service.test.ts
```

**Run with coverage:**
```bash
cd apps/api
pnpm test:coverage
```

**Expected Results:**
- **Trip Service**: 15+ tests, all passing
- **Permissions Service**: 10+ tests, all passing
- **Upload Service**: 8+ tests, all passing
- **Schema Validation**: 5+ tests, all passing
- **Total**: 38+ unit tests passing
- **Coverage**: >80% for Phase 3 code

**Key Test Files:**
- `apps/api/tests/unit/trip.service.test.ts`
- `apps/api/tests/unit/permissions.service.test.ts`
- `apps/api/tests/unit/upload.service.test.ts`
- `shared/schemas/trip.test.ts`

### 2. Integration Tests (Vitest + Supertest)

**Run all integration tests:**
```bash
cd apps/api
pnpm test:integration
```

**Run specific test suite:**
```bash
cd apps/api
pnpm vitest tests/integration/trip.routes.test.ts
```

**Expected Results:**
- **Trip Routes**: 20+ tests, all passing
- **Co-Organizer Routes**: 5+ tests, all passing
- **Image Upload Routes**: 5+ tests, all passing
- **Total**: 30+ integration tests passing

**Key Test Files:**
- `apps/api/tests/integration/trip.routes.test.ts`

**Verification Checklist:**
- [ ] POST /trips creates trip and member records
- [ ] POST /trips enforces member limit
- [ ] POST /trips validates co-organizer phones
- [ ] GET /trips returns user's trips
- [ ] GET /trips/:id returns trip for members only
- [ ] PUT /trips/:id updates trip for organizers
- [ ] DELETE /trips/:id soft-deletes trip
- [ ] POST /trips/:id/co-organizers adds co-organizers
- [ ] DELETE /trips/:id/co-organizers/:userId removes co-organizer
- [ ] POST /trips/:id/cover-image uploads image
- [ ] DELETE /trips/:id/cover-image removes image
- [ ] GET /uploads/:filename serves images

### 3. E2E Tests (Playwright)

**Run all E2E tests:**
```bash
cd apps/web
pnpm test:e2e
```

**Run E2E tests with UI (for debugging):**
```bash
cd apps/web
pnpm test:e2e:ui
```

**Run specific E2E test:**
```bash
cd apps/web
pnpm playwright test tests/e2e/trip-flow.spec.ts
```

**Expected Results:**
- **Create Trip Flow**: 1 test passing
- **Edit Trip Flow**: 1 test passing
- **Permissions Flow**: 1 test passing
- **Co-Organizer Flow**: 1 test passing
- **Total**: 4 E2E tests passing

**Key Test Files:**
- `apps/web/tests/e2e/trip-flow.spec.ts`

**Verification Checklist:**
- [ ] User can create trip via FAB and dialog
- [ ] Trip appears in dashboard after creation
- [ ] Trip detail page displays correct data
- [ ] User can edit trip details
- [ ] User can upload cover image
- [ ] Non-members cannot access trip
- [ ] Non-organizers cannot edit trip
- [ ] Co-organizers can edit trip

### 4. Linting & Type Checking

**Run ESLint:**
```bash
# From root
pnpm lint

# Or per package
cd apps/api && pnpm lint
cd apps/web && pnpm lint
```

**Run TypeScript type checking:**
```bash
# From root
pnpm typecheck

# Or per package
cd apps/api && pnpm typecheck
cd apps/web && pnpm typecheck
```

**Expected Results:**
- No ESLint errors
- No TypeScript errors (strict mode)
- 0 warnings for new Phase 3 code

### 5. Format Check

**Run Prettier check:**
```bash
pnpm format:check
```

**Auto-fix formatting:**
```bash
pnpm format
```

**Expected Results:**
- All files formatted consistently
- Pre-commit hook runs Prettier automatically

## Manual Testing

### Prerequisites

1. Start both servers:
```bash
# Terminal 1: Start API
cd apps/api
pnpm dev

# Terminal 2: Start web app
cd apps/web
pnpm dev
```

2. Create a test user account:
```bash
# Open http://localhost:3000
# Login with test phone: +15551234567
# Enter verification code: 123456
# Complete profile with display name
```

### Test Scenario 1: Create Trip

**Steps:**
1. Navigate to dashboard: `http://localhost:3000/dashboard`
2. Click floating action button (bottom-right, blue gradient)
3. **Step 1**: Fill in basic info:
   - Trip name: "Test Trip to Miami"
   - Destination: "Miami Beach, FL"
   - Start date: (select future date)
   - End date: (select date after start)
   - Timezone: "America/New_York"
   - Click "Continue"
4. **Step 2**: Fill in optional details:
   - Description: "A test trip for verification"
   - Upload cover image (use test-image.jpg, <5MB)
   - Check "Allow members to add events"
   - (Skip co-organizers for now)
   - Click "Create Trip"
5. Verify redirect to trip detail page
6. Verify trip appears on dashboard

**Expected Results:**
- [ ] FAB button visible on dashboard
- [ ] Dialog opens with step indicator (Step 1 of 2)
- [ ] Form validates required fields (name, destination, timezone)
- [ ] Cannot submit Step 1 with invalid data
- [ ] Step 2 loads with progress indicator (Step 2 of 2)
- [ ] Image upload works (preview shown)
- [ ] Trip created successfully
- [ ] Redirected to trip detail page
- [ ] Trip shows in dashboard "Upcoming trips" section
- [ ] Cover image displays on trip card and detail page

### Test Scenario 2: Edit Trip

**Steps:**
1. From dashboard, click on a trip card
2. Click "Edit Trip" button (visible to organizers only)
3. Update trip name to "Updated Trip Name"
4. Update description
5. Upload different cover image
6. Click "Save Changes"
7. Verify changes reflected on detail page
8. Go back to dashboard, verify changes on card

**Expected Results:**
- [ ] Edit button visible (you are organizer)
- [ ] Edit dialog pre-filled with current data
- [ ] Can update all fields
- [ ] Image upload replaces previous image
- [ ] Changes save successfully
- [ ] Trip detail page shows updated data
- [ ] Dashboard card shows updated data
- [ ] Optimistic update: UI updates before API response

### Test Scenario 3: Add Co-Organizer

**Prerequisites:**
- Create second test user account (different phone number)
- Note their phone number

**Steps:**
1. Open trip detail page for a trip you created
2. Click "Edit Trip"
3. In Step 2, add co-organizer phone number: `+15559876543`
4. Click "Save Changes"
5. Verify co-organizer appears in organizer list
6. **Switch accounts**: Logout, login as co-organizer
7. Navigate to dashboard
8. Verify trip appears in co-organizer's trip list
9. Click trip to view detail
10. Verify co-organizer can see "Edit Trip" button
11. Verify co-organizer can edit trip

**Expected Results:**
- [ ] Can add co-organizer phone number
- [ ] Co-organizer added successfully
- [ ] Co-organizer appears in organizer info
- [ ] Co-organizer can see trip in their dashboard
- [ ] Co-organizer can edit trip
- [ ] Co-organizer marked as "Going" (RSVP status)

### Test Scenario 4: Member Limit Enforcement

**Steps:**
1. Create a trip
2. Attempt to add 25+ phone numbers as co-organizers
3. Verify error message appears

**Expected Results:**
- [ ] Error displayed: "Maximum 25 members per trip"
- [ ] Co-organizers not added beyond limit
- [ ] Existing co-organizers remain

### Test Scenario 5: Delete Trip

**Steps:**
1. Open trip detail page for a trip you created
2. Click "Edit Trip"
3. Click "Delete Trip" button
4. Confirm deletion in dialog
5. Verify redirect to dashboard
6. Verify trip no longer appears in trip list
7. Attempt to access trip URL directly
8. Verify 404 error

**Expected Results:**
- [ ] Delete button visible in edit dialog
- [ ] Confirmation dialog appears
- [ ] Trip soft-deleted (cancelled=true in database)
- [ ] Redirected to dashboard
- [ ] Trip not shown in dashboard
- [ ] Direct URL access shows error
- [ ] Trip still exists in database with cancelled=true

### Test Scenario 6: Permissions (Non-Member Access)

**Steps:**
1. Create trip as user A
2. Note trip URL (e.g., `/trips/abc-123-def`)
3. Logout
4. Login as user B (different account, not added as member)
5. Navigate to trip URL directly
6. Verify access denied

**Expected Results:**
- [ ] Error page shown: "You do not have access to this trip" OR "Trip not found"
- [ ] Cannot view trip details
- [ ] Cannot see edit button

### Test Scenario 7: Permissions (Member but Not Organizer)

**Prerequisites:**
- Phase 4 will add member invitations. For Phase 3, manually add member via database:
```sql
INSERT INTO members (trip_id, user_id, status)
VALUES ('trip-uuid', 'user-b-uuid', 'going');
```

**Steps:**
1. Add user B as member (not organizer) via SQL
2. Login as user B
3. Navigate to trip
4. Verify can view trip details
5. Verify "Edit Trip" button NOT visible

**Expected Results:**
- [ ] User B can view trip
- [ ] User B cannot see edit button
- [ ] User B cannot edit trip (API returns 403 if attempted)

### Test Scenario 8: Dashboard Filtering

**Prerequisites:**
- Create 2 trips: one with past dates, one with future dates

**Steps:**
1. Navigate to dashboard
2. Verify "Upcoming trips" section shows only future trips
3. Verify "Past trips" section shows only past trips
4. Verify trips sorted by start date

**Expected Results:**
- [ ] Upcoming trips appear in "Upcoming trips" section
- [ ] Past trips appear in "Past trips" section
- [ ] Empty state shown if no trips in section
- [ ] Trips sorted chronologically

### Test Scenario 9: Image Upload Validation

**Steps:**
1. Create or edit trip
2. Attempt to upload image >5MB
3. Verify error message
4. Attempt to upload non-image file (PDF, TXT, etc.)
5. Verify error message
6. Upload valid image (JPG, <5MB)
7. Verify success

**Expected Results:**
- [ ] Error: "Image must be under 5MB"
- [ ] Error: "Invalid file type. Only JPG, PNG, and WEBP are allowed"
- [ ] Valid image uploads successfully
- [ ] Image preview shown
- [ ] Image URL saved to trip

### Test Scenario 10: Form Validation

**Steps:**
1. Open create trip dialog
2. Submit without filling required fields
3. Verify error messages
4. Enter trip name with 2 characters
5. Verify error: "Trip name must be at least 3 characters"
6. Enter trip name with 101 characters
7. Verify error: "Trip name must not exceed 100 characters"
8. Select end date before start date
9. Verify error: "End date must be on or after start date"

**Expected Results:**
- [ ] Required field errors shown
- [ ] Name length validated (3-100 chars)
- [ ] Date validation works (end >= start)
- [ ] Cannot submit invalid form
- [ ] Inline errors clear when fixed

## Database Verification

### Check Schema

**Verify trips table:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trips'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid, NOT NULL)
- name (character varying, NOT NULL)
- destination (text, NOT NULL)
- start_date (date, nullable)
- end_date (date, nullable)
- preferred_timezone (character varying, NOT NULL)
- description (text, nullable)
- cover_image_url (text, nullable)
- created_by (uuid, NOT NULL, FK to users)
- allow_members_to_add_events (boolean, DEFAULT true)
- cancelled (boolean, DEFAULT false)
- created_at (timestamp, NOT NULL)
- updated_at (timestamp, NOT NULL)

**Verify members table:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'members'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid, NOT NULL)
- trip_id (uuid, NOT NULL, FK to trips, CASCADE)
- user_id (uuid, NOT NULL, FK to users, CASCADE)
- status (enum: going/maybe/not_going/no_response, DEFAULT no_response)
- updated_at (timestamp, NOT NULL)
- created_at (timestamp, NOT NULL)

### Verify Data After Manual Tests

**Check trip creation:**
```sql
SELECT t.id, t.name, t.destination, t.created_by, t.cancelled,
       m.user_id, m.status
FROM trips t
LEFT JOIN members m ON t.id = m.trip_id
WHERE t.name = 'Test Trip to Miami';
```

**Expected:**
- Trip record exists
- Creator has member record with status='going'
- Co-organizers (if added) have member records with status='going'

**Check soft delete:**
```sql
SELECT id, name, cancelled
FROM trips
WHERE cancelled = true;
```

**Expected:**
- Deleted trips have cancelled=true
- Trips not actually removed from database

**Check member count constraint:**
```sql
SELECT t.name, COUNT(m.id) as member_count
FROM trips t
LEFT JOIN members m ON t.id = m.trip_id
GROUP BY t.id, t.name;
```

**Expected:**
- No trip has >25 members

## Performance Checks

### API Response Times

**Measure endpoint performance:**
```bash
# Create trip
curl -w "@curl-format.txt" -o /dev/null -s -X POST http://localhost:8000/trips \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Get trips
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/trips \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Get trip by ID
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/trips/TRIP_ID \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

**curl-format.txt:**
```
time_total: %{time_total}s\n
```

**Expected Response Times (local development):**
- POST /trips: <200ms
- GET /trips: <100ms
- GET /trips/:id: <100ms
- Image upload: <500ms (varies with image size)

### Frontend Performance

**Open DevTools → Performance:**
1. Record page load of dashboard
2. Verify First Contentful Paint <1s
3. Verify Time to Interactive <2s
4. Check for layout shifts (CLS should be minimal)

**Expected:**
- Dashboard loads quickly with skeleton states
- Trip cards render without layout shift
- Images lazy-load properly

## Accessibility Checks

**Run axe DevTools:**
1. Install axe DevTools browser extension
2. Run scan on dashboard page
3. Run scan on trip detail page
4. Run scan on create trip dialog

**Expected:**
- 0 critical accessibility issues
- Form inputs have labels
- Buttons have accessible names
- Images have alt text
- Color contrast meets WCAG AA

## Security Verification

### Authentication

**Test unauthenticated access:**
```bash
curl -i http://localhost:8000/trips
```

**Expected:**
- 401 Unauthorized response

### Authorization

**Test non-organizer editing trip:**
```bash
# Create trip as user A, get auth token
# Try to edit as user B
curl -i -X PUT http://localhost:8000/trips/TRIP_ID \
  -H "Cookie: auth_token=USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked"}'
```

**Expected:**
- 403 Forbidden response

### File Upload Security

**Test file upload with invalid MIME:**
```bash
curl -i -X POST http://localhost:8000/trips/TRIP_ID/cover-image \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -F "image=@test.pdf"
```

**Expected:**
- 400 Bad Request
- Error: "Invalid file type"

**Test file upload > 5MB:**
```bash
# Create 6MB file
dd if=/dev/zero of=big.jpg bs=1M count=6

curl -i -X POST http://localhost:8000/trips/TRIP_ID/cover-image \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -F "image=@big.jpg"
```

**Expected:**
- 400 Bad Request
- Error: "Image must be under 5MB"

### Path Traversal Protection

**Attempt to access file outside uploads directory:**
```bash
curl -i http://localhost:8000/uploads/../../../etc/passwd
```

**Expected:**
- 404 Not Found OR 403 Forbidden
- Cannot access files outside uploads/

## Feature Flags

Phase 3 does not require feature flags. The `allowMembersToAddEvents` field in trips table is a trip-level setting, not a global feature flag.

**Verify setting works:**
```sql
SELECT id, name, allow_members_to_add_events FROM trips;
```

**Expected:**
- Default value is `true`
- Can be toggled via edit trip dialog

## Troubleshooting

### Tests Failing

**Issue: Database connection errors**
```
Solution: Verify PostgreSQL is running
  pnpm docker:up
  pnpm db:migrate
```

**Issue: Tests fail due to stale data**
```
Solution: Clean test database
  cd apps/api
  pnpm db:drop  # (if command exists)
  pnpm db:migrate
```

**Issue: Playwright tests timeout**
```
Solution: Increase timeout or check servers are running
  # Verify servers running:
  curl http://localhost:3000
  curl http://localhost:8000/health
```

### Manual Testing Issues

**Issue: Images not displaying**
```
Solution: Check uploads directory exists and has correct permissions
  ls -la apps/api/uploads
  # Ensure uploads/ in .gitignore
```

**Issue: Cannot add co-organizers**
```
Solution: Verify phone number exists in users table
  SELECT id, phone_number FROM users WHERE phone_number = '+15559876543';
```

**Issue: Trip not appearing in dashboard**
```
Solution: Check member record created
  SELECT * FROM members WHERE user_id = 'YOUR_USER_ID';
```

### GitGuardian Pre-Commit Hook

**Issue: Pre-commit hook fails**
```
Solution: Ensure Docker is running
  docker ps
  # Start Docker if not running
```

## Success Criteria

Phase 3 verification is complete when:

- [ ] All unit tests pass (38+ tests)
- [ ] All integration tests pass (30+ tests)
- [ ] All E2E tests pass (4 tests)
- [ ] Code coverage >80% for Phase 3 code
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] All manual test scenarios pass
- [ ] Database schema verified
- [ ] Security checks pass
- [ ] Accessibility checks pass
- [ ] Performance meets targets
- [ ] Documentation updated

## Known Limitations (Phase 3)

- **No member invitations**: Co-organizers must have existing accounts (Phase 4)
- **No RSVP changes**: Creator and co-organizers always marked "Going" (Phase 4)
- **No events**: Event system coming in Phase 5
- **Local storage only**: Images stored locally, not S3/CDN (Post-MVP)
- **No pagination**: Trip list shows all trips (optimize in future)
- **No search**: Search bar is placeholder (Post-MVP)
