# E2E Tests

End-to-end tests for the Tripful web application using Playwright.

## Prerequisites

1. Backend API server running on `http://localhost:8000`
2. Frontend web server running on `http://localhost:3000`
3. PostgreSQL database accessible
4. Backend in non-production mode to use fixed verification code

## Setup

Install Playwright browsers (one-time setup):

```bash
npx playwright install chromium
```

## Running Tests

### Start the servers

**Terminal 1 - Backend:**

```bash
pnpm --filter @tripful/api dev
```

**Terminal 2 - Frontend:**

```bash
pnpm --filter @tripful/web dev
```

### Run the E2E tests

**Terminal 3 - Tests:**

```bash
# Run all E2E tests
pnpm --filter @tripful/web test:e2e

# Run with UI (interactive mode)
pnpm --filter @tripful/web test:e2e:ui

# Run in headed mode (see browser)
pnpm --filter @tripful/web test:e2e:headed
```

## Test Coverage

The E2E test suite covers:

### Phase 2: Authentication (auth-flow.spec.ts)

1. **Complete authentication flow**
   - Login with phone number
   - Verify with code (fixed: 123456)
   - Complete profile with display name
   - Navigate to dashboard
   - Verify cookie is set

2. **Logout flow**
   - Logout from dashboard
   - Verify redirect to login
   - Verify cookie is cleared
   - Verify cannot access protected routes

3. **Protected route access**
   - Attempt to access dashboard without auth
   - Verify redirect to login

4. **Existing user flow**
   - Login with existing phone number
   - Skip profile completion
   - Direct navigation to dashboard

### Phase 3: Trip Management (trip-flow.spec.ts)

**Test File**: `trip-flow.spec.ts` (902 lines, 4 test suites)

1. **Trip Creation Flow**
   - Create trip via CreateTripDialog (2-step form)
   - Verify trip appears on dashboard
   - Navigate to trip detail page
   - Verify all trip information displayed correctly

2. **Trip Editing Flow**
   - Open EditTripDialog from trip detail page
   - Edit trip details (name, destination, dates, description)
   - Verify changes reflected immediately
   - Edit settings (member permissions toggle)
   - Verify settings updated

3. **Permission System Tests**
   - Test organizer-only actions (edit, delete, settings)
   - Test member permissions based on trip settings
   - Verify "Allow members to add events" toggle behavior
   - Test access control enforcement

4. **Co-Organizer Management**
   - Add co-organizer by phone number
   - Verify co-organizer appears in list
   - Remove co-organizer
   - Verify cannot remove trip creator
   - Test co-organizer permissions (can edit, delete, manage settings)

**Coverage:**

- Trip CRUD operations (create, read, update, delete)
- Two-step trip creation form
- Tabbed edit dialog (Details, Settings, Cover Image, Delete)
- Permission system and access control
- Co-organizer management
- Image upload functionality
- Dashboard trip list and search
- Trip grouping (Your Trips, Other Trips, Past Trips)

## Test Data

- **Test phone number:** `+15551234567`
- **Test verification code:** `123456` (fixed in non-production environments)
- **Test display name:** `Test User`

## Notes

- Tests run sequentially to avoid database conflicts
- Each test clears cookies before running for isolation
- Backend uses fixed verification code `123456` when `NODE_ENV !== 'production'`
- Tests assume both servers are already running (not auto-started)

## Debugging

- Use `test:e2e:headed` to see the browser actions
- Use `test:e2e:ui` for interactive debugging
- Screenshots and videos are captured on failure in `test-results/`
- View HTML report after test run: `npx playwright show-report`
