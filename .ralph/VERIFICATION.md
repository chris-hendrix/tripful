# Phase 2: SMS Authentication - Verification

## Environment Setup

### Prerequisites

- Node.js 22.x LTS installed
- PostgreSQL 16+ running (via Docker or local)
- pnpm installed globally

### Database Setup

Start PostgreSQL using Docker Compose:

```bash
# From project root
docker-compose up -d postgres

# Verify postgres is running
docker-compose ps
```

**Expected output:** Container `tripful-postgres` should be running on port 5432.

### Environment Variables

**Backend** (apps/api/.env or apps/api/.env.local):

```bash
DATABASE_URL=postgresql://tripful:tripful@localhost:5432/tripful
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=8000

# JWT_SECRET will be auto-generated on first run if missing
# JWT_SECRET=<will be auto-generated>
```

**Frontend** (apps/web/.env.local):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Install Dependencies

```bash
# From project root
pnpm install

# Verify installs
pnpm --filter @tripful/api list | grep libphonenumber-js
pnpm --filter @tripful/api list | grep @fastify/cookie
pnpm --filter @tripful/web list | grep @tanstack/react-query
```

**Expected:** All three packages should be listed.

### Run Database Migrations

```bash
# From project root
pnpm --filter @tripful/api db:generate
pnpm --filter @tripful/api db:migrate

# Verify tables created
docker exec -it tripful-postgres psql -U tripful -d tripful -c "\dt"
```

**Expected output:** Should show `users` and `verification_codes` tables.

### Start Development Servers

**Terminal 1 - Backend:**

```bash
pnpm --filter @tripful/api dev
```

**Expected output:**

```
Server listening at http://localhost:8000
✓ Generated JWT secret and saved to .env.local
```

**Terminal 2 - Frontend:**

```bash
pnpm --filter @tripful/web dev
```

**Expected output:**

```
▲ Next.js 16.0.0
- Local: http://localhost:3000
```

## Verification Test Suites

### 1. Unit Tests (Backend Services)

```bash
# Test authentication service
pnpm --filter @tripful/api test src/services/auth.service.test.ts

# Test phone validation
pnpm --filter @tripful/api test src/utils/phone.test.ts

# Test JWT utilities
pnpm --filter @tripful/api test src/config/jwt.test.ts

# Test SMS service mock
pnpm --filter @tripful/api test src/services/sms.service.test.ts
```

**Pass criteria:** All unit tests pass (0 failures).

**Tests should cover:**

- ✓ Code generation (6 digits, numeric)
- ✓ Code storage with expiry
- ✓ Code verification (valid, invalid, expired)
- ✓ User creation and profile updates
- ✓ JWT token generation and verification
- ✓ Phone number validation (US, international, invalid formats)
- ✓ SMS mock console logging

### 2. Integration Tests (API Endpoints)

```bash
# Test all auth endpoints
pnpm --filter @tripful/api test src/routes/auth.routes.test.ts
pnpm --filter @tripful/api test src/controllers/auth.controller.test.ts

# Test authentication middleware
pnpm --filter @tripful/api test src/middleware/auth.middleware.test.ts

# Test rate limiting
pnpm --filter @tripful/api test src/middleware/rate-limit.middleware.test.ts
```

**Pass criteria:** All integration tests pass (0 failures).

**Tests should cover:**

- ✓ POST /api/auth/request-code (valid phone, invalid phone, rate limited)
- ✓ POST /api/auth/verify-code (valid code, invalid code, expired code)
- ✓ POST /api/auth/complete-profile (valid profile, missing display name)
- ✓ GET /api/auth/me (authenticated, unauthenticated)
- ✓ POST /api/auth/logout (clears cookie)
- ✓ Authentication middleware (valid token, invalid token, missing token)
- ✓ Rate limiting (5 requests pass, 6th fails)

### 3. Frontend Unit Tests

```bash
# Test auth context
pnpm --filter @tripful/web test app/providers/auth-provider.test.tsx

# Test API client
pnpm --filter @tripful/web test lib/api.test.ts

# Test shared validation schemas
pnpm test --filter @tripful/shared
```

**Pass criteria:** All frontend unit tests pass.

**Tests should cover:**

- ✓ Auth context login/verify/logout methods
- ✓ API client error handling
- ✓ Zod schema validation (valid/invalid inputs)

### 4. End-to-End Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# Or run specific test file
pnpm exec playwright test tests/e2e/auth-flow.spec.ts
```

**Pass criteria:** All E2E tests pass.

**Test scenarios:**

1. **Complete authentication flow:**
   - Navigate to /login
   - Enter phone number +15551234567
   - Click "Continue"
   - Navigate to /verify
   - Enter code 123456 (fixed test code)
   - Navigate to /complete-profile
   - Enter display name "Test User"
   - Navigate to /dashboard
   - Verify user is logged in (check for user profile)

2. **Login validation errors:**
   - Enter invalid phone number
   - See error message "Invalid phone number format"

3. **Verification errors:**
   - Enter wrong code (654321)
   - See error "Invalid code. Please try again"

4. **Protected route access:**
   - Navigate to /dashboard without authentication
   - Redirected to /login

5. **Logout flow:**
   - Log in as user
   - Click logout
   - Redirected to /login
   - Navigate to /dashboard
   - Redirected to /login (no longer authenticated)

### 5. Type Checking

```bash
# Backend type checking
pnpm --filter @tripful/api typecheck

# Frontend type checking
pnpm --filter @tripful/web typecheck

# Shared package type checking
pnpm --filter @tripful/shared typecheck
```

**Pass criteria:** No TypeScript errors (0 errors).

### 6. Linting

```bash
# Lint all packages
pnpm lint

# Or individually
pnpm --filter @tripful/api lint
pnpm --filter @tripful/web lint
```

**Pass criteria:** No linting errors (0 errors).

## Manual Verification with Browser

### Test SMS Code Flow

1. **Start servers** (backend + frontend)

2. **Navigate to login page:** http://localhost:3000/login

3. **Enter phone number:** +15551234567

4. **Click "Continue"**

   **Expected:**
   - Backend console should show:
     ```
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     📱 SMS Verification Code
     Phone: +15551234567
     Code: 123456
     Expires: 5 minutes
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ```
   - Frontend redirects to `/verify?phone=%2B15551234567`

5. **Enter verification code from console** (e.g., 123456)

6. **Click "Verify"**

   **Expected:**
   - If new user: Redirect to `/complete-profile`
   - If existing user: Redirect to `/dashboard`

7. **Complete profile** (if new user)
   - Enter display name: "John Doe"
   - Select timezone: (defaults to browser timezone)
   - Click "Continue"

   **Expected:**
   - Redirect to `/dashboard`
   - User profile appears in dashboard

8. **Verify authentication persists**
   - Refresh page
   - User should still be logged in (no redirect to login)

9. **Test logout**
   - Click logout button
   - Redirect to `/login`
   - Try accessing `/dashboard` directly
   - Should redirect to `/login`

### Test Rate Limiting

1. **Use Postman or curl to send 6 requests rapidly:**

```bash
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/auth/request-code \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber": "+15551234567"}'
  echo "\nRequest $i complete\n"
done
```

**Expected:**

- Requests 1-5: `{ "success": true, "message": "Code sent" }`
- Request 6: `{ "success": false, "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Too many verification code requests..." } }`

### Test Phone Validation

Try various phone formats in login form:

- ✓ Valid US: +15551234567
- ✓ Valid US (alt format): +1 (555) 123-4567
- ✓ Valid international: +447911123456 (UK)
- ✗ Invalid (no country code): 5551234567 → should show error
- ✗ Invalid (too short): +1555 → should show error
- ✗ Invalid (letters): +1abc123 → should show error

### Test Cookie Behavior

1. **Log in successfully**

2. **Open browser DevTools → Application → Cookies**

3. **Verify `auth_token` cookie exists:**
   - Name: `auth_token`
   - HttpOnly: ✓ (checked)
   - Secure: ✓ (if HTTPS)
   - SameSite: Strict or Lax

4. **Decode JWT token:**
   - Copy token value
   - Go to https://jwt.io
   - Paste token
   - Verify payload contains: `sub`, `phone`, `name`, `iat`, `exp`

5. **Test cookie expiry:**
   - JWT should expire in 7 days
   - Browser session should persist across page refreshes

## Feature Flags

No feature flags required for Phase 2.

## URLs and Ports

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **Database:** postgresql://localhost:5432/tripful
- **Drizzle Studio:** http://localhost:4983 (run `pnpm --filter @tripful/api db:studio`)

## Test Data

**Test phone numbers** (for manual testing):

- +15551234567 (US format)
- +447911123456 (UK format)
- +33612345678 (France format)

**Test verification code** (predictable for E2E):

- In test environment: Always return `123456`
- In dev environment: Random 6-digit code logged to console

## Manual Testing with Playwright MCP

If testing requires visual verification (screenshots), use Playwright MCP:

```bash
# Take screenshot after login
browser.screenshot("apps/api/.ralph/screenshots/iteration-001-login-page.png")

# Take screenshot after verification
browser.screenshot("apps/api/.ralph/screenshots/iteration-001-verification-page.png")

# Take screenshot of dashboard
browser.screenshot("apps/api/.ralph/screenshots/iteration-001-dashboard-logged-in.png")
```

**Save screenshots to:** `.ralph/screenshots/`

## Success Criteria Summary

Phase 2 is complete when:

- ✅ All unit tests pass (services, utilities)
- ✅ All integration tests pass (API endpoints, middleware)
- ✅ All E2E tests pass (full auth flow)
- ✅ No TypeScript errors (typecheck passes)
- ✅ No linting errors (lint passes)
- ✅ Manual verification: User can log in, verify code, complete profile, and access dashboard
- ✅ Rate limiting works (5 requests max per phone per hour)
- ✅ JWT tokens stored in httpOnly cookies
- ✅ Phone validation works for US and international formats
- ✅ Console logs show verification codes clearly
- ✅ Protected routes redirect to login when unauthenticated
