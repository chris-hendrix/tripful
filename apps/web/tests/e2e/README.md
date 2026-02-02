# E2E Tests

End-to-end tests for the Tripful web application using Playwright.

## Prerequisites

1. Backend API server running on `http://localhost:8000`
2. Frontend web server running on `http://localhost:3000`
3. PostgreSQL database accessible
4. Backend configured with `TEST_MODE=true` to use fixed verification code

## Setup

Install Playwright browsers (one-time setup):

```bash
npx playwright install chromium
```

## Running Tests

### Start the servers

**Terminal 1 - Backend (with test mode):**
```bash
TEST_MODE=true pnpm --filter @tripful/api dev
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

## Test Data

- **Test phone number:** `+15551234567`
- **Test verification code:** `123456` (fixed when `TEST_MODE=true`)
- **Test display name:** `Test User`

## Notes

- Tests run sequentially to avoid database conflicts
- Each test clears cookies before running for isolation
- Backend must be in test mode (`TEST_MODE=true`) to use fixed verification code
- Tests assume both servers are already running (not auto-started)

## Debugging

- Use `test:e2e:headed` to see the browser actions
- Use `test:e2e:ui` for interactive debugging
- Screenshots and videos are captured on failure in `test-results/`
- View HTML report after test run: `npx playwright show-report`
