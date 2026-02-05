# Tasks: Phase 3 - Trip Management

## Task Overview

This phase implements trip CRUD operations, co-organizer management, image uploads, and UI for dashboard and trip detail views. Tasks are broken down into small, verifiable chunks following **Test-Driven Development (TDD)** - unit and integration tests are written BEFORE implementation code to ensure quality and design.

**Total Estimated Tasks**: 31 (down from 35 - unit/integration tests now integrated into implementation tasks)

---

## 1. Backend Foundation

- [x] Task 1.1: Create trip schemas in shared package
  - Create `shared/schemas/trip.ts`
  - Define `createTripSchema` with Zod (name, destination, dates, timezone, description, coverImageUrl, allowMembersToAddEvents, coOrganizerPhones)
  - Define `updateTripSchema` (partial of createTripSchema)
  - Define `addCoOrganizerSchema`
  - Add IANA timezone validation
  - Add date validation (end >= start)
  - Export TypeScript types via `z.infer`
  - Add unit tests for schema validation edge cases
  - **Acceptance Criteria:**
    - Schemas validate all required fields correctly
    - Timezone validation rejects invalid IANA strings
    - Date validation ensures end >= start
    - Schema tests cover all edge cases (name length, date ranges, etc.)

- [ ] Task 1.2: Create upload service for image handling
  - Create `apps/api/src/services/upload.service.ts`
  - Implement `IUploadService` interface (uploadImage, deleteImage, validateImage)
  - Implement file validation (5MB max, MIME type check: image/jpeg, image/png, image/webp)
  - Implement local storage in `apps/api/uploads/` with UUID filenames
  - Implement file deletion
  - Create upload directory if not exists
  - Add comprehensive unit tests
  - **Acceptance Criteria:**
    - Validates file size correctly (rejects > 5MB)
    - Validates MIME types correctly (only JPG/PNG/WEBP)
    - Saves files to uploads/ directory with UUID names
    - Returns correct URL path (/uploads/{uuid}.{ext})
    - Deletes files correctly
    - All unit tests pass

- [ ] Task 1.3: Create permissions service for authorization
  - Create `apps/api/src/services/permissions.service.ts`
  - Implement `IPermissionsService` interface
  - Implement `canEditTrip(userId, tripId)`: Check if user is creator OR co-organizer
  - Implement `canDeleteTrip(userId, tripId)`: Same as canEditTrip
  - Implement `canManageCoOrganizers(userId, tripId)`: Same as canEditTrip
  - Implement `isOrganizer(userId, tripId)`: Check creator OR member with status='going' added at creation
  - Implement `isMember(userId, tripId)`: Check if member record exists
  - Add comprehensive unit tests with database setup/teardown

  **Acceptance Criteria:**
  - Creator can edit/delete their trips
  - Co-organizers can edit/delete trips they co-organize
  - Non-organizers cannot edit/delete
  - Permission checks query database correctly
  - All unit tests pass with clean test data

---

## 2. Trip Service Implementation

- [ ] Task 2.1: Implement createTrip in trip service (TDD)
  - Create test file: `apps/api/tests/unit/trip.service.test.ts`
  - Write failing tests for `createTrip`:
    - Test: Creates trip record with correct data
    - Test: Automatically adds creator as member with status='going'
    - Test: Adds co-organizers as members when provided
    - Test: Returns trip object with all fields populated
  - Create `apps/api/src/services/trip.service.ts`
  - Implement `ITripService` interface (define all method signatures)
  - Implement `createTrip(userId, data)` to make tests pass:
    - Insert trip record
    - Insert creator as member with status='going'
    - Validate and insert co-organizers if provided
    - Return trip with organizers
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (4+ tests)
  - Trip record created with correct data
  - Creator automatically added as member
  - Co-organizers added as members with status='going'
  - Returns trip object with all fields
  - Tests use unique phone numbers for parallel execution

---

- [ ] Task 2.2: Implement co-organizer validation and member limit (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: Rejects co-organizer phone that doesn't exist in users table
    - Test: Correctly counts current members via getMemberCount()
    - Test: Rejects adding co-organizers when limit (25) would be exceeded
    - Test: Returns appropriate error messages for each validation failure
  - Implement in `trip.service.ts`:
    - In `createTrip` and `addCoOrganizers`: Validate co-organizer phone numbers
    - Look up users by phone number
    - Throw error if phone not found in system
    - Implement `getMemberCount(tripId)` helper
    - Enforce 25-member limit (creator + co-organizers + future invitees)
    - Throw error if limit exceeded
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (4+ new tests)
  - Rejects co-organizer phones that don't exist
  - Correctly counts current members
  - Rejects adding co-organizers if limit exceeded
  - Returns appropriate error messages

---

- [ ] Task 2.3: Implement getTripById (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: Returns full trip details when user is a member
    - Test: Returns null when trip doesn't exist
    - Test: Returns null when user is not a member
    - Test: Includes organizer information (creator + co-organizers)
    - Test: Includes member count
  - Implement `getTripById(tripId, userId)`:
    - Query trip with creator info
    - Load organizers (creator + co-organizers)
    - Load member count
    - Return null if trip not found or user not member
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (5+ tests)
  - Returns full trip details for members
  - Returns null for non-members
  - Includes organizer information
  - Includes member count

---

- [ ] Task 2.4: Implement getUserTrips for dashboard (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: Returns all trips where user is a member
    - Test: Returns empty array when user has no trips
    - Test: Summary includes all required fields (id, name, destination, dates, coverImageUrl, isOrganizer, rsvpStatus, organizerInfo, memberCount, eventCount)
    - Test: isOrganizer flag is true for creator and co-organizers
    - Test: Trips ordered by startDate (upcoming first)
  - Implement `getUserTrips(userId)`:
    - Query all trips where user is a member
    - Build trip summaries with all required fields
    - Order by startDate (upcoming first, then past)
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (5+ tests)
  - Returns all trips user is member of
  - Summary includes all required fields
  - isOrganizer flag set correctly
  - Ordered by start date

---

- [ ] Task 2.5: Implement updateTrip (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: Organizer can update trip successfully
    - Test: Non-organizer receives permission error
    - Test: Only provided fields are updated (partial update)
    - Test: updatedAt timestamp is refreshed
  - Implement `updateTrip(tripId, userId, data)`:
    - Check permissions via permissionsService.canEditTrip()
    - Throw error if not authorized
    - Update trip record with provided fields
    - Return updated trip
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (4+ tests)
  - Organizers can update trip
  - Non-organizers receive permission error
  - Only provided fields are updated
  - updatedAt timestamp refreshed

---

- [ ] Task 2.6: Implement cancelTrip - soft delete (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: Organizer can cancel trip successfully
    - Test: Non-organizer receives permission error when attempting to cancel
    - Test: Trip marked as cancelled (cancelled=true) in database
    - Test: Trip record still exists in database (not hard deleted)
  - Implement `cancelTrip(tripId, userId)`:
    - Check permissions via permissionsService.canDeleteTrip()
    - Throw error if not authorized
    - Set cancelled=true
    - Set updatedAt to now
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (4+ tests)
  - Organizers can cancel trip
  - Non-organizers cannot cancel
  - Trip marked as cancelled in database
  - Trip not deleted from database (soft delete)

---

- [ ] Task 2.7: Implement co-organizer management methods (TDD)
  - Write failing tests in `trip.service.test.ts`:
    - Test: addCoOrganizers succeeds when called by organizer
    - Test: addCoOrganizers fails when called by non-organizer
    - Test: addCoOrganizers creates member records with status='going'
    - Test: addCoOrganizers enforces 25-member limit
    - Test: removeCoOrganizer succeeds when called by organizer
    - Test: removeCoOrganizer prevents removing trip creator
    - Test: getCoOrganizers returns all co-organizers
  - Implement `addCoOrganizers(tripId, userId, phoneNumbers)`:
    - Check permissions via permissionsService.canManageCoOrganizers()
    - Validate phone numbers (users exist)
    - Check member limit
    - Create member records with status='going'
  - Implement `removeCoOrganizer(tripId, userId, coOrgUserId)`:
    - Check permissions
    - Prevent removing trip creator
    - Delete member record
  - Implement `getCoOrganizers(tripId)`
  - Verify all tests pass

  **Acceptance Criteria:**
  - All unit tests pass (7+ tests)
  - Co-organizers can be added by organizers
  - Member limit enforced
  - Co-organizers can be removed
  - Creator cannot be removed

---

## 3. Trip Controller & Routes

- [ ] Task 3.1: Create trip controller with POST /trips endpoint (TDD)
  - Create test file: `apps/api/tests/integration/trip.routes.test.ts`
  - Write failing integration tests:
    - Test: POST /trips returns 201 with trip data on success
    - Test: POST /trips returns 400 for invalid data (name too short, invalid dates)
    - Test: POST /trips returns 409 when member limit exceeded
    - Test: POST /trips returns 401 without auth token
    - Test: POST /trips creates member record for creator
  - Create `apps/api/src/controllers/trip.controller.ts`
  - Implement `createTrip` handler to make tests pass:
    - Validate request body with createTripSchema
    - Extract userId from JWT (request.user)
    - Call tripService.createTrip(userId, data)
    - Return 201 with trip data
    - Handle errors (400 validation, 409 member limit)
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (5+ tests)
  - POST /trips returns 201 on success
  - Returns 400 for invalid data
  - Returns 409 for member limit exceeded
  - Returns 401 without auth

---

- [ ] Task 3.2: Add GET /trips endpoint (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: GET /trips returns user's trips with correct structure
    - Test: GET /trips returns empty array when user has no trips
    - Test: GET /trips returns 401 without auth token
  - Implement `getUserTrips` handler to make tests pass:
    - Extract userId from JWT (request.user)
    - Call tripService.getUserTrips(userId)
    - Return 200 with trips array
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (3+ tests)
  - GET /trips returns user's trips
  - Returns empty array if no trips
  - Returns 401 without auth

---

- [ ] Task 3.3: Add GET /trips/:id endpoint (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: GET /trips/:id returns 200 with trip data for members
    - Test: GET /trips/:id returns 404 for non-existent trip
    - Test: GET /trips/:id returns 403 for non-members
    - Test: GET /trips/:id returns 401 without auth token
  - Implement `getTripById` handler to make tests pass:
    - Validate tripId param (UUID format)
    - Extract userId from JWT
    - Call tripService.getTripById(tripId, userId)
    - Return 200 with trip data OR 404 if null/403 if not member
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (4+ tests)
  - GET /trips/:id returns trip for members
  - Returns 404 for non-existent trip
  - Returns 403 for non-members
  - Returns 401 without auth

---

- [ ] Task 3.4: Add PUT /trips/:id endpoint (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: PUT /trips/:id returns 200 with updated trip for organizers
    - Test: PUT /trips/:id returns 403 for non-organizers
    - Test: PUT /trips/:id returns 400 for invalid data
    - Test: PUT /trips/:id returns 404 for non-existent trip
    - Test: PUT /trips/:id returns 401 without auth token
  - Implement `updateTrip` handler to make tests pass:
    - Validate request body with updateTripSchema
    - Extract userId from JWT
    - Call tripService.updateTrip(tripId, userId, data)
    - Return 200 with updated trip
    - Handle errors (400 validation, 403 forbidden, 404 not found)
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (5+ tests)
  - PUT /trips/:id updates trip for organizers
  - Returns 403 for non-organizers
  - Returns 400 for invalid data
  - Returns 404 for non-existent trip

---

- [ ] Task 3.5: Add DELETE /trips/:id endpoint (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: DELETE /trips/:id returns 204 for organizers
    - Test: DELETE /trips/:id soft-deletes trip (cancelled=true in DB)
    - Test: DELETE /trips/:id returns 403 for non-organizers
    - Test: DELETE /trips/:id returns 404 for non-existent trip
    - Test: DELETE /trips/:id returns 401 without auth token
  - Implement `cancelTrip` handler to make tests pass:
    - Extract userId from JWT
    - Call tripService.cancelTrip(tripId, userId)
    - Return 204 No Content
    - Handle errors (403 forbidden, 404 not found)
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (5+ tests)
  - DELETE /trips/:id cancels trip for organizers
  - Returns 403 for non-organizers
  - Returns 404 for non-existent trip
  - Trip soft-deleted (cancelled=true)

---

- [ ] Task 3.6: Add co-organizer management endpoints (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: POST /trips/:id/co-organizers returns 200 and adds co-organizers
    - Test: POST /trips/:id/co-organizers returns 403 for non-organizers
    - Test: POST /trips/:id/co-organizers returns 400 for non-existent user phone
    - Test: DELETE /trips/:id/co-organizers/:userId returns 204 and removes co-organizer
    - Test: DELETE /trips/:id/co-organizers/:userId returns 403 for non-organizers
    - Test: Both endpoints return 401 without auth
  - Implement handlers to make tests pass:
    - `POST /trips/:id/co-organizers`: Validate body, call tripService.addCoOrganizers
    - `DELETE /trips/:id/co-organizers/:userId`: Call tripService.removeCoOrganizer
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (6+ tests)
  - POST endpoint adds co-organizers
  - DELETE endpoint removes co-organizer
  - Both require organizer permissions
  - Returns appropriate status codes

---

- [ ] Task 3.7: Add image upload endpoints (TDD)
  - Write failing integration tests in `trip.routes.test.ts`:
    - Test: POST /trips/:id/cover-image uploads image and returns updated trip
    - Test: POST /trips/:id/cover-image validates file size (rejects >5MB)
    - Test: POST /trips/:id/cover-image validates MIME type (rejects invalid types)
    - Test: DELETE /trips/:id/cover-image removes image and clears coverImageUrl
    - Test: GET /uploads/:filename serves uploaded images
    - Test: Upload endpoints return 403 for non-organizers
    - Test: Upload endpoints return 401 without auth
  - Implement handlers to make tests pass:
    - `POST /trips/:id/cover-image`: Use @fastify/multipart, validate with uploadService, save file, update trip
    - `DELETE /trips/:id/cover-image`: Delete file via uploadService, clear trip.coverImageUrl
    - `GET /uploads/:filename`: Serve static files from uploads directory
  - Verify all tests pass

  **Acceptance Criteria:**
  - All integration tests pass (7+ tests)
  - POST endpoint uploads and saves image
  - Returns updated trip with coverImageUrl
  - DELETE endpoint removes image and clears URL
  - GET /uploads/:filename serves images
  - Validates file size and type

---

- [ ] Task 3.8: Register trip routes
  - Create `apps/api/src/routes/trip.routes.ts`
  - Register all trip endpoints with authentication middleware
  - Export route registration function
  - Import and register in main server file

  **Acceptance Criteria:**
  - All routes registered correctly
  - Authentication middleware applied to all routes
  - Server starts without errors
  - Routes accessible at /trips endpoints

---

## 4. Frontend Components

- [ ] Task 4.1: Create trip card component
  - Create `apps/web/src/components/trip/trip-card.tsx`
  - Display: cover image, name, destination, dates, RSVP badge, organizer avatars, event count
  - Match demo design (rounded corners, shadows, hover effects)
  - Add click handler to navigate to trip detail
  - Handle missing cover image (show placeholder or gradient)

  **Acceptance Criteria:**
  - Card displays all trip summary data
  - Matches demo aesthetic
  - Clickable to navigate to detail page
  - Handles edge cases (no image, no dates, etc.)

---

- [ ] Task 4.2: Create image upload component
  - Create `apps/web/src/components/trip/image-upload.tsx`
  - Implement file input with drag-and-drop
  - Show image preview
  - Validate file size (5MB) and type (JPG/PNG/WEBP) on client
  - Display upload progress/loading state
  - Handle upload errors

  **Acceptance Criteria:**
  - Supports file input and drag-and-drop
  - Shows preview before upload
  - Validates file constraints client-side
  - Displays loading state during upload
  - Shows error messages clearly

---

- [ ] Task 4.3: Create create trip dialog (Step 1: Basic Info)
  - Create `apps/web/src/components/trip/create-trip-dialog.tsx`
  - Implement dialog with shadcn Dialog component
  - Step 1 form: name, destination, start/end dates, timezone
  - Progress indicator (Step 1 of 2)
  - Validation with createTripSchema
  - Display inline errors
  - "Continue" button to go to Step 2

  **Acceptance Criteria:**
  - Dialog opens/closes correctly
  - Form validates all fields
  - Inline errors display for invalid inputs
  - Progress indicator shows "Step 1 of 2"
  - Navigates to Step 2 on continue

---

- [ ] Task 4.4: Create create trip dialog (Step 2: Details & Co-Orgs)
  - Step 2 form: description, cover image upload, allowMembersToAddEvents checkbox, co-organizer phones
  - Progress indicator (Step 2 of 2)
  - Multi-input for co-organizer phone numbers
  - "Back" button to return to Step 1
  - "Create Trip" button to submit
  - Handle loading state during creation

  **Acceptance Criteria:**
  - Step 2 form includes all optional fields
  - Co-organizer input allows multiple phone numbers
  - Can navigate back to Step 1
  - Submit button creates trip via API
  - Loading state shown during creation

---

- [ ] Task 4.5: Implement create trip mutation with optimistic updates
  - Create `apps/web/src/hooks/use-trips.ts`
  - Implement `useCreateTrip` hook with useMutation
  - Optimistic update: Add trip to cache immediately
  - On success: Invalidate trips query, redirect to trip detail page
  - On error: Rollback optimistic update, show error message
  - Add error boundary

  **Acceptance Criteria:**
  - Trip appears immediately in UI
  - Redirects to trip detail on success
  - Rollback on error with clear error message
  - Network errors handled gracefully

---

- [ ] Task 4.6: Create edit trip dialog
  - Create `apps/web/src/components/trip/edit-trip-dialog.tsx`
  - Pre-populate form with existing trip data
  - Use same two-step structure as create dialog
  - Add "Delete Trip" button with confirmation
  - Implement update mutation with optimistic updates

  **Acceptance Criteria:**
  - Dialog pre-fills with current trip data
  - Updates trip on submit
  - Optimistic update works correctly
  - Delete button shows confirmation dialog
  - Only organizers see edit UI

---

## 5. Dashboard & Detail Pages

- [ ] Task 5.1: Redesign dashboard page
  - Update `apps/web/src/app/(app)/dashboard/page.tsx`
  - Replace simple user info with trip listing
  - Implement "Upcoming trips" and "Past trips" sections
  - Use TripCard component for each trip
  - Add search bar (placeholder, no functionality yet)
  - Empty states with CTAs

  **Acceptance Criteria:**
  - Dashboard shows two sections: upcoming and past
  - Trips display in TripCard components
  - Empty state shows when no trips
  - Search bar present (placeholder)
  - Matches demo design

---

- [ ] Task 5.2: Add floating action button for create trip
  - Add FAB (fixed bottom-right position)
  - Click opens CreateTripDialog
  - Match demo design (gradient, shadow, plus icon)
  - Responsive (hide on mobile in favor of header button if needed)

  **Acceptance Criteria:**
  - FAB visible and positioned correctly
  - Opens create dialog on click
  - Matches demo styling
  - Works on mobile and desktop

---

- [ ] Task 5.3: Implement trip data fetching in dashboard
  - Use `useTrips` hook with useQuery
  - Fetch from GET /trips endpoint
  - Filter trips into upcoming/past based on startDate
  - Handle loading state (skeleton cards)
  - Handle error state
  - Auto-refresh on window focus

  **Acceptance Criteria:**
  - Trips load on page mount
  - Loading skeleton shows during fetch
  - Error state displays if fetch fails
  - Trips correctly filtered by date
  - Auto-refresh works

---

- [ ] Task 5.4: Create trip detail page
  - Create `apps/web/src/app/(app)/trips/[id]/page.tsx`
  - Display cover image hero section (if available)
  - Trip header: name, destination, dates
  - Organizer info with avatars
  - RSVP badge (placeholder - always "Going" for creator/co-org in Phase 3)
  - Event count display (0 events)
  - Empty state: "No events yet"
  - Settings/Edit button (organizers only)

  **Acceptance Criteria:**
  - Trip details display correctly
  - Cover image shown if available
  - Organizers see edit button
  - Non-organizers don't see edit button
  - Empty state for events shown
  - Matches demo design

---

- [ ] Task 5.5: Implement trip detail data fetching
  - Use `useTripDetail(id)` hook with useQuery
  - Fetch from GET /trips/:id endpoint
  - Handle loading state
  - Handle error states (404, 403)
  - Show error page for non-existent or inaccessible trips

  **Acceptance Criteria:**
  - Trip details load correctly
  - 404 error shows "Trip not found" page
  - 403 error shows "No access" page
  - Loading state shown while fetching
  - Error states handled gracefully

---

- [ ] Task 5.6: Integrate edit dialog into trip detail page
  - Add edit button (organizers only)
  - Open EditTripDialog on click
  - Pass trip data to dialog for pre-population
  - Refresh trip detail after successful edit
  - Show success toast/message

  **Acceptance Criteria:**
  - Edit button visible to organizers only
  - Dialog opens with pre-filled data
  - Trip detail refreshes after update
  - Success message shown on update
  - Works with optimistic updates

---

## 6. E2E Testing

- [ ] Task 6.1: Write E2E test for create trip flow
  - Create test file: `apps/web/tests/e2e/trip-flow.spec.ts`
  - Write test: Login → Dashboard → Click FAB → Fill form (2 steps) → Create trip → View trip detail
  - Use Playwright with test fixtures
  - Verify trip appears in dashboard
  - Verify trip detail page shows correct data
  - Verify cover image displays if uploaded

  **Acceptance Criteria:**
  - E2E test covers full create flow
  - Test creates real trip in test database
  - Verifies UI at each step
  - Test passes consistently

---

- [ ] Task 6.2: Write E2E test for edit trip flow
  - Write test in `trip-flow.spec.ts`: Login → Dashboard → Click trip → Click edit → Update fields → Save → Verify changes
  - Include image upload test (upload new cover image)
  - Verify optimistic updates (UI updates before API response)
  - Test edit dialog pre-population

  **Acceptance Criteria:**
  - E2E test covers edit flow
  - Image upload tested
  - Changes persist correctly
  - Test passes consistently
  - Optimistic updates verified

---

- [ ] Task 6.3: Write E2E test for permissions
  - Write test in `trip-flow.spec.ts`:
    - Create trip as user A
    - Logout and login as user B (not a member)
    - Attempt to access trip detail URL directly
    - Verify error page: "You do not have access to this trip" OR "Trip not found"
  - Verify edit button not visible to non-organizers

  **Acceptance Criteria:**
  - E2E test verifies access control
  - Non-members cannot view trip
  - Non-organizers cannot edit
  - Error messages display correctly

---

- [ ] Task 6.4: Write E2E test for co-organizer management
  - Test: Create trip → Add co-organizer → Verify co-org can edit trip
  - Test removing co-organizer

  **Acceptance Criteria:**
  - E2E test covers co-org addition
  - Verifies co-org permissions
  - Tests co-org removal
  - Test passes consistently

---

## 7. Final Polish

- [ ] Task 7.1: Add loading states and error handling
  - Loading skeletons for dashboard trip cards
  - Loading spinners for dialogs during submission
  - Error toasts for failed operations
  - Retry logic for failed uploads
  - Network error handling

  **Acceptance Criteria:**
  - All async operations show loading states
  - Errors display clear messages
  - User can retry failed operations
  - UI remains responsive during loads

---

- [ ] Task 7.2: Add environment configuration
  - Add UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES to .env.example
  - Update README with new env vars
  - Add uploads/ to .gitignore
  - Verify environment validation

  **Acceptance Criteria:**
  - .env.example updated
  - .gitignore includes uploads/
  - README documents new config
  - Env validation passes

---

- [ ] Task 7.3: Code review and cleanup
  - Review all code for consistency
  - Remove console.logs and debug code
  - Ensure TypeScript strict mode compliance
  - Run linter and fix issues
  - Format code with Prettier

  **Acceptance Criteria:**
  - No linter errors
  - No TypeScript errors in strict mode
  - Code formatted consistently
  - No debug code remains

---

- [ ] Task 7.4: Update documentation
  - Update ARCHITECTURE.md with implementation notes
  - Document any deviations from plan
  - Add API endpoint documentation to README
  - Update DEVELOPMENT.md with Phase 3 info

  **Acceptance Criteria:**
  - All docs updated
  - API endpoints documented
  - Deviations noted (if any)
  - Clear for next developer

---

- [ ] Task 7.5: Final testing and verification
  - Run full test suite (unit + integration + E2E)
  - Verify all acceptance criteria met
  - Manual testing of all flows
  - Check code coverage (target >80%)
  - Create summary report

  **Acceptance Criteria:**
  - All tests pass
  - Code coverage >80%
  - All acceptance criteria met
  - Manual testing completed
  - Ready for merge

---

## Task Completion Checklist

After completing all tasks, verify:

- [ ] All 31 tasks marked as complete
- [ ] All unit tests passing (target: 38+ tests across all services)
- [ ] All integration tests passing (target: 30+ tests across all routes)
- [ ] All E2E tests passing (4 scenarios)
- [ ] Code coverage >80% for Phase 3 code
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Documentation updated
- [ ] Manual testing completed per VERIFICATION.md
- [ ] Ready for Phase 4

**TDD Verification:**
- [ ] All service unit tests written BEFORE implementation
- [ ] All route integration tests written BEFORE controllers
- [ ] Test files created in first step of each implementation task
- [ ] All tests pass on completion of each task
