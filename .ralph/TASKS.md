# Phase 2: SMS Authentication - Tasks

## Task Breakdown

- [x] Task 1: Database schema and migrations for auth tables
  - Create Drizzle schema for `users` table with all fields (id, phone_number, display_name, profile_photo_url, timezone, timestamps)
  - Create Drizzle schema for `verification_codes` table (phone_number PK, code, expires_at, created_at)
  - Add indexes (users.phone_number unique, verification_codes.expires_at)
  - Generate and apply migration with `pnpm db:generate` and `pnpm db:migrate`
  - Add types exports to schema/index.ts
  - Write unit test to verify schema definitions are correct

- [x] Task 2: Shared validation schemas and types
  - Create `shared/schemas/auth.ts` with Zod schemas (requestCodeSchema, verifyCodeSchema, completeProfileSchema)
  - Create `shared/types/user.ts` with User and AuthResponse interfaces
  - Export all schemas and types from shared package
  - Write unit tests for schema validation (valid/invalid cases)

- [x] Task 3: JWT configuration and utilities
  - Install `@fastify/cookie` package in backend
  - Create `src/config/jwt.ts` with ensureJWTSecret() function (auto-generates JWT_SECRET to .env.local if missing)
  - Define JWTPayload interface in src/types/index.ts
  - Register @fastify/cookie and @fastify/jwt plugins in server.ts with correct configuration
  - Write unit tests for JWT secret generation and persistence

- [x] Task 4: Phone validation utilities
  - Install `libphonenumber-js` package in backend
  - Create `src/utils/phone.ts` with validatePhoneNumber() function
  - Function should return { isValid, e164, error } format
  - Handle all edge cases (invalid formats, missing country codes, etc.)
  - Write comprehensive unit tests with various phone formats (US, international, invalid)

- [x] Task 5: Mock SMS service implementation
  - Create `src/services/sms.service.ts` with ISMSService interface
  - Implement MockSMSService class that logs to console with clear formatting
  - Console output should show phone number, code, and expiry (5 minutes)
  - Export singleton instance for use in AuthService
  - Write unit tests to verify console logging (spy on console.log)

- [ ] Task 6: Authentication service with code management
  - Create `src/services/auth.service.ts` with AuthService class
  - Implement generateCode() - returns 6-digit random numeric string
  - Implement storeCode() - inserts/updates verification_codes table with 5-min expiry
  - Implement verifyCode() - checks code exists, matches, and not expired
  - Implement deleteCode() - removes code after successful verification
  - Implement getOrCreateUser() - finds or creates user by phone number
  - Implement updateProfile() - updates display name and timezone
  - Write unit tests for each method with in-memory database

- [ ] Task 7: JWT token generation and verification
  - Add generateToken(user) method to AuthService - creates JWT with 7-day expiry
  - Add verifyToken(token) method to AuthService - validates and returns payload
  - Token payload should include sub (user ID), phone, name (optional), iat, exp
  - Write unit tests for token generation and verification (valid/expired/invalid tokens)

- [ ] Task 8: Authentication middleware
  - Create `src/middleware/auth.middleware.ts` with authenticate() function
  - Extract token from auth_token cookie
  - Verify token using Fastify JWT plugin
  - Attach { id, phoneNumber } to request.user
  - Return 401 error for missing/invalid tokens
  - Create requireCompleteProfile() middleware for profile check
  - Write integration tests for middleware (valid/invalid/missing tokens)

- [ ] Task 9: Rate limiting configuration
  - Create `src/middleware/rate-limit.middleware.ts` with smsRateLimitConfig
  - Configure @fastify/rate-limit with 5 max per hour
  - Use phone number as key (fallback to IP)
  - Custom error response with RATE_LIMIT_EXCEEDED code
  - Write integration tests to verify rate limits work (6th request fails)

- [ ] Task 10: Request code endpoint with validation
  - Create `src/controllers/auth.controller.ts` with requestCode handler
  - Create `src/routes/auth.routes.ts` and register POST /auth/request-code
  - Validate phone number with libphonenumber-js
  - Call AuthService.generateCode() and storeCode()
  - Call SMSService.sendVerificationCode() (logs to console)
  - Apply rate limiting middleware (5 per phone per hour)
  - Return success response
  - Write integration tests (valid phone, invalid phone, rate limit exceeded)

- [ ] Task 11: Verify code endpoint and user creation
  - Add verifyCode handler to auth.controller.ts
  - Register POST /auth/verify-code in routes
  - Validate request body with Zod schema
  - Call AuthService.verifyCode() - handle invalid/expired codes
  - Call AuthService.getOrCreateUser() to fetch/create user
  - Generate JWT token with AuthService.generateToken()
  - Set httpOnly cookie in response
  - Return { user, requiresProfile: !user.displayName } (requiresProfile true if displayName empty)
  - Delete verification code from DB
  - Write integration tests (valid code, invalid code, expired code, new vs existing user)

- [ ] Task 12: Complete profile endpoint
  - Add completeProfile handler to auth.controller.ts
  - Register POST /auth/complete-profile in routes
  - Apply authenticate middleware (requires JWT)
  - Validate displayName (3-50 chars) and timezone (optional)
  - Call AuthService.updateProfile()
  - Re-generate JWT token with updated profile info
  - Set new httpOnly cookie
  - Return updated user
  - Write integration tests (valid profile, invalid display name, unauthenticated request)

- [ ] Task 13: Get current user and logout endpoints
  - Add getMe handler to auth.controller.ts - returns current user from request.user
  - Add logout handler - clears auth_token cookie
  - Register GET /auth/me and POST /auth/logout in routes
  - Both require authenticate middleware
  - Write integration tests (authenticated vs unauthenticated)

- [ ] Task 14: Frontend auth context and provider
  - Install `@tanstack/react-query` in web package
  - Create `app/providers/auth-provider.tsx` with AuthContext and useAuth hook
  - Implement login(), verify(), completeProfile(), logout(), refetch() methods
  - Use fetch with credentials: 'include' for cookie handling
  - Track user state and loading state
  - Fetch user on mount (call GET /auth/me)
  - Wrap app in AuthProvider in root layout
  - Write unit tests for auth context methods (mock fetch)

- [ ] Task 15: Login page with phone input
  - Create `app/(auth)/login/page.tsx` with phone input form
  - Add country code dropdown (default +1) using react-hook-form
  - Validate phone number on blur with Zod schema
  - Call useAuth().login() on submit
  - Redirect to /verify?phone=<number> on success
  - Show error toast for invalid phone or rate limit
  - Apply auth layout styling from DESIGN.md (dark gradient background, white card)
  - Write E2E test with Playwright (submit valid phone, navigate to verify page)

- [ ] Task 16: Verification page with code input
  - Create `app/(auth)/verify/page.tsx` with 6-digit code input
  - Read phone number from query param
  - Display phone number in bold above input
  - Auto-focus input on mount
  - Monospace, centered, tracking-widest styling
  - Call useAuth().verify() on submit
  - If requiresProfile true, redirect to /complete-profile
  - Else redirect to /dashboard
  - Add "Change number" link (back to login) and "Resend code" link
  - Show error for invalid/expired code
  - Write E2E test (enter code, redirect to complete-profile or dashboard)

- [ ] Task 17: Complete profile page
  - Create `app/(auth)/complete-profile/page.tsx` with display name form
  - Display name input (3-50 chars, required)
  - Timezone selector (optional, defaults to Intl.DateTimeFormat().resolvedOptions().timeZone)
  - Call useAuth().completeProfile() on submit
  - Redirect to /dashboard on success
  - Protected route - must be authenticated
  - Show error for invalid display name
  - Write E2E test (complete profile, redirect to dashboard)

- [ ] Task 18: Protected route wrapper
  - Create `app/(app)/layout.tsx` for protected routes
  - Use useAuth() to check authentication
  - Redirect to /login if not authenticated
  - Show loading spinner while checking auth
  - Write E2E test (access protected route without auth, redirect to login)

- [ ] Task 19: API client utilities
  - Create `lib/api.ts` with apiRequest() wrapper function
  - Custom APIError class with code and message
  - Automatically includes credentials: 'include' for cookies
  - Throws APIError on non-2xx responses
  - Write unit tests for API client (mock fetch, test error handling)

- [ ] Task 20: E2E test for complete auth flow
  - Write Playwright test that covers full authentication journey
  - Start at login page, enter phone number
  - Navigate to verify page, enter code (use fixed code 123456 in test env)
  - Complete profile with display name
  - Verify redirect to dashboard
  - Verify user is logged in (check cookie or user state)
  - Test logout flow (clear cookie, redirect to login)
  - Test protected route access (logged out user redirected to login)
