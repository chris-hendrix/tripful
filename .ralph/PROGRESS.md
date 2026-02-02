# Ralph Execution Progress

This file tracks learnings and outcomes from each Ralph iteration.

## Iteration 1: Database schema and migrations

**Status:** SUCCESS ✅

**Summary:** Created Drizzle schema for users and verification_codes tables, generated migrations, applied to database, and added unit tests.

**Tests Run:**
- Unit tests: 7/7 passing (schema validation tests)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/db/schema/index.ts` - users and verification_codes tables with proper indexes
- `apps/api/drizzle/0000_initial_schema.sql` - migration file
- `apps/api/src/db/schema/schema.test.ts` - unit tests for schema validation

**Verification:**
- Database tables created successfully with correct columns and indexes
- Timestamps default to now() as expected
- UUID primary keys auto-generate
- All type exports working correctly

**Key Learnings:**
1. Drizzle schema definition syntax requires importing specific types from drizzle-orm/pg-core
2. Migrations are generated with `pnpm db:generate` and applied with `pnpm db:migrate`
3. Schema tests verify structure without requiring database connection
4. displayName allows empty string (default for new users before profile completion)

---

## Iteration 2: Shared validation schemas and types

**Status:** SUCCESS ✅

**Summary:** Created Zod validation schemas and TypeScript interfaces in shared package for authentication endpoints.

**Tests Run:**
- Unit tests: 18/18 passing (schema validation tests)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `packages/shared/src/schemas/auth.ts` - Zod schemas (requestCodeSchema, verifyCodeSchema, completeProfileSchema)
- `packages/shared/src/types/user.ts` - User and AuthResponse interfaces
- `packages/shared/src/schemas/auth.test.ts` - comprehensive validation tests (18 tests)

**Verification:**
- All schemas exported correctly from shared package
- Validation rules tested extensively (valid/invalid cases)
- Type inference working correctly with z.infer<>

**Key Learnings:**
1. Zod schemas provide both runtime validation and TypeScript type inference
2. Custom error messages improve UX: `.min(3, { message: 'Custom error' })`
3. Phone number validation uses simple min/max length (libphonenumber-js handles actual validation in backend)
4. Verification code must be exactly 6 digits with regex pattern /^\d{6}$/
5. displayName has 3-50 character constraint matching database schema
6. Shared package tests run independently from backend/frontend

---

## Iteration 3: JWT configuration and utilities

**Status:** SUCCESS ✅

**Summary:** Set up JWT authentication infrastructure with auto-generating secrets, cookie support, and Fastify plugin registration.

**Tests Run:**
- Unit tests: 6/6 passing (JWT secret generation and persistence)
- Type check: PASS
- Linting: PASS
- Integration test: Server starts successfully with JWT plugin registered

**Files Created/Modified:**
- `apps/api/src/config/jwt.ts` - ensureJWTSecret() function with auto-generation
- `apps/api/src/types/index.ts` - JWTPayload interface and Fastify type augmentation
- `apps/api/src/config/jwt.test.ts` - unit tests for secret generation and persistence
- `apps/api/src/server.ts` - registered @fastify/cookie and @fastify/jwt plugins

**Dependencies Installed:**
- `@fastify/cookie` - Cookie parsing and setting support
- `@fastify/jwt` - JWT token generation and verification

**Verification:**
- JWT_SECRET auto-generates to .env.local if missing (64-char hex string)
- Secret persists across server restarts
- Fastify JWT plugin registered with 7-day expiry and cookie support
- Cookie plugin registered before JWT plugin (required dependency)
- TypeScript types augmented correctly for request.user

**Key Learnings:**
1. JWT secrets should be generated using crypto.randomBytes(64).toString('hex') for security
2. @fastify/cookie must be registered BEFORE @fastify/jwt for cookie support
3. JWT plugin configuration includes sign options (expiresIn) and cookie options (cookieName)
4. Fastify types can be augmented with `declare module 'fastify'` to add custom request properties
5. JWTPayload should include sub (user ID), phone, optional name, iat, and exp
6. Tests should verify both auto-generation and persistence of secrets
7. .env.local is git-ignored and appropriate for local secrets

---

## Iteration 4: Phone validation utilities

**Status:** SUCCESS ✅

**Summary:** Created phone validation utility using libphonenumber-js with comprehensive test coverage for various phone formats.

**Tests Run:**
- Unit tests: 15/15 passing (phone validation tests)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/utils/phone.ts` - validatePhoneNumber() function returning { isValid, e164?, error? }
- `apps/api/src/utils/phone.test.ts` - comprehensive tests for US, international, and invalid formats

**Dependencies Installed:**
- `libphonenumber-js` - Industry-standard phone number validation and formatting

**Verification:**
- Validates US phone numbers in multiple formats (+1..., (555)...)
- Validates international numbers (UK +44, France +33, etc.)
- Rejects invalid formats (no country code, too short, non-numeric)
- Returns E.164 format (+15551234567) for valid numbers
- Handles edge cases (missing country code, letters, too short)

**Key Learnings:**
1. libphonenumber-js provides parsePhoneNumber() and isValidPhoneNumber() functions
2. E.164 format is the international standard: +[country code][number] (e.g., +15551234567)
3. Phone validation should return structured result: { isValid, e164?, error? }
4. Try-catch is necessary because parsePhoneNumber can throw for malformed input
5. isValidPhoneNumber should be called BEFORE parsePhoneNumber to avoid exceptions
6. Different countries have different phone number lengths and formats
7. Edge cases to test: missing +, letters in number, too short/long, spaces, parentheses
8. The library handles formatting variations automatically (spaces, dashes, parentheses)

---

## Iteration 5: Mock SMS service implementation

**Status:** SUCCESS ✅

**Summary:** Created SMS service interface and mock implementation that logs verification codes to console with clear formatting.

**Tests Run:**
- Unit tests: 4/4 passing (SMS service tests)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/services/sms.service.ts` - ISMSService interface and MockSMSService implementation
- `apps/api/src/services/sms.service.test.ts` - unit tests with console.log spies

**Verification:**
- MockSMSService logs to console with clear Unicode box drawing characters
- Output includes phone number, code, and expiry (5 minutes)
- Singleton instance exported for use in AuthService
- Tests verify console output using vi.spyOn(console, 'log')

**Key Learnings:**
1. Service interfaces enable future implementation swaps (mock → real SMS provider)
2. Console output should be highly visible for development (Unicode borders, emojis)
3. Singleton pattern (export const smsService = new MockSMSService()) simplifies dependency injection
4. Vitest can spy on console methods: vi.spyOn(console, 'log')
5. Tests should verify console output contains expected information (phone, code, expiry)
6. Console logs should be silenced in tests using vi.mock('console')
7. Mock services are perfect for MVP development before integrating real APIs
8. Interface definition: async sendVerificationCode(phoneNumber: string, code: string): Promise<void>

---

## Iteration 6: Authentication service with code management

**Status:** SUCCESS ✅

**Summary:** Created AuthService with comprehensive code generation, storage, verification, and user management methods. All core authentication logic implemented with extensive test coverage.

**Tests Run:**
- Unit tests: 37/37 passing (AuthService tests with in-memory database)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/services/auth.service.ts` - AuthService class with 7 methods (generateCode, storeCode, verifyCode, deleteCode, getOrCreateUser, updateProfile, generateToken)
- `apps/api/tests/unit/auth.service.test.ts` - comprehensive unit tests (37 tests, 586 lines)
- `apps/api/tests/helpers.ts` - test utilities (buildTestApp helper)

**Verification:**
- generateCode() creates 6-digit numeric strings
- storeCode() upserts to verification_codes with 5-minute expiry
- verifyCode() validates code exists, matches, and not expired
- deleteCode() removes code after verification
- getOrCreateUser() finds existing or creates new user with defaults
- updateProfile() updates displayName and/or timezone
- Tests use in-memory SQLite database for isolation

**Key Learnings:**
1. **Code Generation**: Use Math.floor(Math.random() * 1000000).toString().padStart(6, '0') for 6-digit codes
2. **Code Storage**: Use INSERT ... ON CONFLICT for upsert pattern in PostgreSQL
3. **Expiry Logic**: Store expiresAt as timestamp: new Date(Date.now() + 5 * 60 * 1000)
4. **Code Verification**: Check three conditions: code exists, matches, and not expired (< now())
5. **User Creation**: Default values for new users: displayName: '', timezone: 'UTC'
6. **Profile Update**: Always set updatedAt timestamp when updating user fields
7. **Test Database**: Use in-memory SQLite (:memory:) for fast, isolated tests
8. **Test Helpers**: Extract common setup (buildTestApp) to helpers.ts for reusability
9. **generateToken Method**: Will be implemented in Task 7 (requires JWT plugin)
10. **Database Pattern**: Use Drizzle's .returning() to get inserted/updated records
11. **Error Handling**: Throw descriptive errors for not-found cases

**Test Organization:**
- Tests grouped by method (describe blocks)
- Each method has success cases and edge cases
- Database state verified after operations (actual DB queries)
- Timestamps tested (createdAt, updatedAt, expiresAt)

---

## Iteration 7: JWT token generation and verification

**Status:** SUCCESS ✅

**Summary:** Added JWT token generation and verification methods to AuthService, enabling stateless authentication with 7-day token expiry.

**Tests Run:**
- Unit tests: 43/43 passing (6 new JWT tests added to auth.service.test.ts)
- Type check: PASS
- Linting: PASS

**Files Modified:**
- `apps/api/src/services/auth.service.ts` - Added generateToken() and verifyToken() methods
- `apps/api/tests/unit/auth.service.test.ts` - Added 6 new tests for JWT generation and verification
- `apps/api/tests/helpers.ts` - Added JWT plugin registration to test app builder

**Verification:**
- generateToken() creates valid JWT with correct payload structure
- Token includes sub (user ID), phone, name (if displayName exists), iat, exp
- Token expiry set to 7 days from generation
- verifyToken() successfully decodes valid tokens
- verifyToken() rejects expired tokens (tested with 1ms expiry)
- verifyToken() rejects tokens with invalid signatures

**Key Learnings:**
1. **JWT Payload Structure**: Must include sub (subject/user ID), phone for lookups, optional name, iat (issued at), exp (expiry)
2. **Token Generation**: Use Fastify's jwt.sign() method with payload and options
3. **Optional Name Field**: Only include name in payload if user.displayName is set and non-empty
4. **Token Expiry**: Specify expiresIn as string '7d' or number in seconds (7 * 24 * 60 * 60)
5. **Token Verification**: Use Fastify's jwt.verify() which throws on invalid tokens
6. **Constructor Pattern**: AuthService constructor accepts optional FastifyInstance for JWT operations
7. **Backward Compatibility**: Singleton instance (authService) still works; create new instance with Fastify for JWT: new AuthService(request.server)
8. **Test Strategy**: Use very short expiry (1ms) to test expired token rejection without waiting
9. **Type Safety**: verifyToken returns JWTPayload type for type-safe payload access
10. **Error Handling**: verifyToken throws errors for invalid/expired tokens (caller should try-catch)

**Token Lifecycle:**
1. Generate token on successful verification (POST /auth/verify-code)
2. Store in httpOnly cookie with 7-day maxAge
3. Middleware extracts and verifies on protected endpoints
4. Re-generate on profile updates to include updated displayName

---

## Iteration 8: Authentication middleware

**Status:** SUCCESS ✅

**Summary:** Created authentication middleware for protecting routes and requiring complete user profiles, with comprehensive integration tests covering all auth scenarios.

**Tests Run:**
- Integration tests: 11/11 passing (auth.middleware.test.ts)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/middleware/auth.middleware.ts` - authenticate() and requireCompleteProfile() middleware functions
- `apps/api/tests/integration/auth.middleware.test.ts` - comprehensive integration tests (11 tests)

**Verification:**
- authenticate() middleware extracts JWT from cookie and populates request.user
- Returns 401 UNAUTHORIZED for missing or invalid tokens
- requireCompleteProfile() middleware checks if user has displayName set
- Returns 403 PROFILE_INCOMPLETE for users without displayName
- Middleware can be chained using preHandler array
- Tests verify actual HTTP responses using app.inject()

**Key Learnings:**
1. **JWT Verification in Middleware**: Use `await request.jwtVerify()` which automatically extracts token from cookie and populates `request.user`
2. **request.user Structure**: After jwtVerify(), contains decoded JWT payload { sub, phone, name?, iat, exp }
3. **Middleware Function Signature**: `async function middleware(request: FastifyRequest, reply: FastifyReply): Promise<void>`
4. **Early Returns**: Middleware should return `reply.status(...).send(...)` to short-circuit request
5. **Error Response Format**: Consistent structure with `{ success: false, error: { code, message } }`
6. **Profile Completion Check**: Query database to check if user.displayName exists and is non-empty
7. **Middleware Chaining**: Use `preHandler: [authenticate, requireCompleteProfile]` array for multiple middlewares
8. **Test Pattern**: Create test routes with middleware, generate JWT tokens, inject requests, verify responses
9. **Token Generation in Tests**: Use `app.jwt.sign({ sub, phone, name })` to create valid tokens
10. **Cookie vs Header**: Middleware works with cookies (primary) but Fastify JWT also supports Authorization header
11. **Empty String Check**: Profile is incomplete if displayName is empty string OR null: `!user.displayName || user.displayName.trim() === ''`

**Middleware Order:**
- authenticate() must run FIRST to populate request.user
- requireCompleteProfile() depends on request.user being set
- Other business logic middleware can run after authentication

**Error Codes:**
- UNAUTHORIZED (401): Missing, invalid, or expired token
- PROFILE_INCOMPLETE (403): User authenticated but profile not complete

---

## Iteration 9: Rate limiting configuration

**Status:** SUCCESS ✅

**Summary:** Configured rate limiting middleware to prevent SMS abuse, with 5 requests per hour per phone number. Integration tests verify rate limiting works correctly.

**Tests Run:**
- Integration tests: 7/7 passing (rate-limit.middleware.test.ts)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/middleware/rate-limit.middleware.ts` - smsRateLimitConfig for @fastify/rate-limit plugin
- `apps/api/tests/integration/rate-limit.middleware.test.ts` - integration tests with test route

**Dependencies Installed:**
- `@fastify/rate-limit@^10.1.1` - Fastify rate limiting plugin

**Verification:**
- First 5 requests succeed (200 OK)
- 6th request fails with 429 RATE_LIMIT_EXCEEDED
- Rate limit uses phone number from request body as key
- Falls back to IP address if phone number not present
- Custom error response matches standard error format
- Tests verify actual rate limiting behavior

**Key Learnings:**
1. **Plugin Configuration**: Rate limit plugin accepts configuration object with max, timeWindow, keyGenerator, errorResponseBuilder
2. **Max Requests**: Set to 5 requests per phone number per hour (matches security requirements)
3. **Time Window**: Specify as string '1 hour' or milliseconds (3600000)
4. **Key Generator**: Extract phone number from request.body: `(request) => request.body.phoneNumber || request.ip`
5. **Fallback to IP**: If phone number not present (e.g., malformed request), use IP address to prevent abuse
6. **Custom Error Response**: Use errorResponseBuilder to return consistent error format with code and message
7. **Error Code**: Use 'RATE_LIMIT_EXCEEDED' for consistency with other error codes
8. **Test Strategy**: Make 6 rapid requests in a loop, verify 6th fails with 429 status
9. **Route-Specific Limits**: Apply rate limiting per-route using preHandler, not globally
10. **Plugin Registration**: Register @fastify/rate-limit plugin once in server.ts, then use config objects per route
11. **Request Body Access**: keyGenerator can access request.body (parsed by @fastify/formbody or similar)

**Rate Limit Configuration Pattern:**
```typescript
export const smsRateLimitConfig = {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (request: FastifyRequest) => {
    const body = request.body as { phoneNumber?: string };
    return body.phoneNumber || request.ip;
  },
  errorResponseBuilder: () => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification code requests. Please try again later.',
    },
  }),
};
```

**Apply to Route:**
```typescript
fastify.post('/request-code', {
  preHandler: fastify.rateLimit(smsRateLimitConfig)
}, handler);
```

---

## Iteration 10: Request code endpoint with validation

**Status:** SUCCESS ✅

**Summary:** Implemented POST /auth/request-code endpoint with phone validation, code generation, SMS sending, and rate limiting. Comprehensive integration tests verify all scenarios.

**Tests Run:**
- Integration tests: 16/16 passing (auth.request-code.test.ts)
- Type check: PASS
- Linting: PASS

**Files Created:**
- `apps/api/src/controllers/auth.controller.ts` - requestCode handler
- `apps/api/src/routes/auth.routes.ts` - auth routes registration
- `apps/api/tests/integration/auth.request-code.test.ts` - comprehensive integration tests (16 tests)

**Verification:**
- Valid phone numbers (+1..., +44...) generate codes and return 200 success
- Invalid phone formats return 400 VALIDATION_ERROR
- Phone validation uses libphonenumber-js for robust validation
- Generated codes stored in database with 5-minute expiry
- SMS service logs codes to console (mock implementation)
- Rate limiting prevents more than 5 requests per hour per phone
- Error responses follow standard format with success: false, error.code, error.message

**Key Learnings:**
1. **Controller Pattern**: Controllers handle HTTP request/response, delegate business logic to services
2. **Zod Validation First**: Validate request body with schema.safeParse() BEFORE any business logic
3. **Validation Error Format**: Return 400 with details array from Zod: `{ success: false, error: { code: 'VALIDATION_ERROR', message, details: result.error.issues } }`
4. **Phone Validation Two-Layer**: Zod validates structure (string, length), then libphonenumber-js validates format
5. **E.164 Format**: Store phone numbers in E.164 format (+15551234567) for consistency
6. **Service Integration**: Call authService methods (generateCode, storeCode) and smsService.sendVerificationCode
7. **Rate Limiting Application**: Apply rate limit config via preHandler: `{ preHandler: fastify.rateLimit(smsRateLimitConfig) }`
8. **Success Response**: Return 200 with `{ success: true, message: 'Verification code sent' }`
9. **Error Handling**: Wrap business logic in try-catch, return 500 INTERNAL_SERVER_ERROR on unexpected errors
10. **Error Logging**: Use request.log.error() with context for debugging: `request.log.error({ error, phoneNumber }, 'Failed to send code')`
11. **Database Verification**: Tests should verify codes are actually stored in DB with correct expiry
12. **Test Organization**: Group tests by Success Cases, Validation Errors, Rate Limiting, Database Verification
13. **Integration Test Pattern**: Use buildApp() helper, inject requests, verify responses, clean up database in afterEach
14. **Database Cleanup**: Critical for test isolation: `await db.delete(verificationCodes).where(...)` in afterEach

**Controller Method Pattern:**
```typescript
async requestCode(request: FastifyRequest, reply: FastifyReply) {
  // 1. Validate request body
  const result = requestCodeSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: '...', details: result.error.issues } });
  }

  // 2. Extract validated data
  const { phoneNumber } = result.data;

  // 3. Additional validation (phone format)
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.isValid) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } });
  }

  try {
    // 4. Business logic (generate code, store, send SMS)
    const code = authService.generateCode();
    await authService.storeCode(validation.e164, code);
    await smsService.sendVerificationCode(validation.e164, code);

    // 5. Success response
    return reply.status(200).send({ success: true, message: 'Verification code sent' });
  } catch (error) {
    // 6. Error handling
    request.log.error({ error, phoneNumber: validation.e164 }, 'Failed to send code');
    return reply.status(500).send({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send verification code' } });
  }
}
```

**Route Registration Pattern:**
```typescript
import type { FastifyInstance } from 'fastify';
import { authController } from '@/controllers/auth.controller.js';
import { smsRateLimitConfig } from '@/middleware/rate-limit.middleware.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/request-code', {
    preHandler: fastify.rateLimit(smsRateLimitConfig)
  }, authController.requestCode);
}
```

---

## Iteration 11: Verify code endpoint and user creation

**Status:** SUCCESS ✅

**Summary:** Implemented POST /auth/verify-code endpoint with code verification, user creation/retrieval, JWT token generation, and cookie management. Comprehensive integration tests cover all scenarios including new vs existing users.

**Tests Run:**
- Integration tests: 16/16 passing (auth.verify-code.test.ts)
- Type check: PASS
- Linting: PASS

**Files Created:**
- Added verifyCode handler to `apps/api/src/controllers/auth.controller.ts`
- Added POST /verify-code route to `apps/api/src/routes/auth.routes.ts`
- Created `apps/api/tests/integration/auth.verify-code.test.ts` - comprehensive integration tests (16 tests)

**Verification:**
- Valid verification code returns 200 with user object and requiresProfile flag
- Invalid codes return 400 INVALID_CODE error
- Expired codes (> 5 minutes old) return 400 INVALID_CODE error
- New users created with empty displayName (requiresProfile: true)
- Existing users return complete profile (requiresProfile: false)
- JWT token generated and set in httpOnly cookie with 7-day expiry
- Verification code deleted from database after successful verification
- Cookie settings verified: httpOnly, sameSite: Lax, path: /, maxAge: 7 days
- Database state verified after each operation

**Key Learnings:**

1. **requiresProfile Logic**: Return `true` if displayName is empty OR whitespace-only: `!user.displayName || user.displayName.trim() === ''`

2. **JWT Token Generation with Updated Profile**: Create new AuthService instance with Fastify context to access JWT plugin:
   ```typescript
   const serviceWithFastify = new AuthService(request.server);
   const token = serviceWithFastify.generateToken(user);
   ```

3. **httpOnly Cookie Security**: Set token only in cookie (NOT in response body) for better security:
   ```typescript
   reply.setCookie('auth_token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     path: '/',
     maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
   });
   ```

4. **Code Deletion Timing**: Delete verification code AFTER successful verification to prevent replay attacks, even if subsequent operations fail.

5. **Error Code Specificity**: Use specific error code INVALID_CODE (not VALIDATION_ERROR) for business logic errors like wrong/expired codes.

6. **User Creation Pattern**: getOrCreateUser() returns existing user OR creates new one with defaults (displayName: '', timezone: 'UTC'), eliminating separate create/fetch logic.

7. **Response Format**: Return `{ success: true, user, requiresProfile }` where requiresProfile indicates if profile completion is needed.

8. **Cookie Testing**: Fastify's inject() supports cookies via `cookies: { cookie_name: value }` object. Response cookies verified through `response.cookies` array.

9. **Test Organization**: Group tests by concern (Success Cases, Validation Errors, Invalid Code Cases, Database Verification) for maintainability.

10. **Database Verification in Tests**: Always verify database state changes (codes deleted, users created) to ensure business logic works correctly.

11. **Token Payload Verification**: Decode JWT in tests to verify payload contains correct user data (sub, phone, name if present).

**Controller Implementation Pattern:**
```typescript
async verifyCode(request: FastifyRequest, reply: FastifyReply) {
  // 1. Validate request body
  const result = verifyCodeSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: result.error.issues } });
  }

  // 2. Validate phone format
  const { phoneNumber, code } = result.data;
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.isValid) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } });
  }

  try {
    // 3. Verify code
    const isValid = await authService.verifyCode(validation.e164, code);
    if (!isValid) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired verification code' } });
    }

    // 4. Get or create user
    const user = await authService.getOrCreateUser(validation.e164);

    // 5. Generate JWT token
    const serviceWithFastify = new AuthService(request.server);
    const token = serviceWithFastify.generateToken(user);

    // 6. Set httpOnly cookie
    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // 7. Determine if profile completion needed
    const requiresProfile = !user.displayName || user.displayName.trim() === '';

    // 8. Delete verification code
    await authService.deleteCode(validation.e164);

    // 9. Return success
    return reply.status(200).send({
      success: true,
      user,
      requiresProfile,
    });
  } catch (error) {
    request.log.error({ error, phoneNumber: validation.e164 }, 'Failed to verify code');
    return reply.status(500).send({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to verify code' } });
  }
}
```

**Test Pattern for Existing vs New Users:**
```typescript
// New user test
await db.delete(users).where(eq(users.phoneNumber, testPhone)); // Ensure no existing user
const response = await app.inject({
  method: 'POST',
  url: '/api/auth/verify-code',
  payload: { phoneNumber: testPhone, code: testCode },
});
expect(response.statusCode).toBe(200);
const body = JSON.parse(response.body);
expect(body.requiresProfile).toBe(true); // New user needs profile

// Existing user test
await db.insert(users).values({
  phoneNumber: testPhone,
  displayName: 'John Doe',
  timezone: 'America/New_York',
});
const response = await app.inject({
  method: 'POST',
  url: '/api/auth/verify-code',
  payload: { phoneNumber: testPhone, code: testCode },
});
expect(response.statusCode).toBe(200);
const body = JSON.parse(response.body);
expect(body.requiresProfile).toBe(false); // Existing user has profile
```

### Code Review Feedback

**Strengths:**
- Excellent code organization and consistency with Task 10
- Comprehensive test coverage (16 tests, all scenarios)
- Robust two-layer validation (Zod + libphonenumber-js)
- Security best practices (httpOnly cookies, CSRF protection, token expiry)
- Proper error handling with clear error codes
- Database state verification in tests
- Good documentation with JSDoc comments

**Issues Noted:**
1. **[MEDIUM] Response Format Inconsistency**: Architecture doc specifies `{ token, user, requiresProfile }` but implementation returns `{ success: true, user, requiresProfile }` (token only in cookie). Current implementation is more secure. TASKS.md correctly specifies the implemented format. Recommendation: Update ARCHITECTURE.md to match implementation.

2. **[LOW] AuthService Instance Pattern**: Creates new AuthService instance for JWT generation (`new AuthService(request.server)`) while using singleton for other methods. This is functionally correct but inconsistent. Future refactoring could improve this pattern.

**Recommendations:**
- Update ARCHITECTURE.md line 64 to match actual implementation
- Consider refactoring AuthService initialization in future iterations

### Key Learnings

1. **JWT Cookie Security**: Setting token only in httpOnly cookie (not in response body) is more secure than including it in both places. This prevents JavaScript access and reduces XSS attack surface.

2. **requiresProfile Logic**: Check both empty string AND whitespace-only strings (`!user.displayName || user.displayName.trim() === ''`). This handles edge cases where users might enter spaces.

3. **AuthService Instance Management**: When singleton doesn't have required dependencies (like Fastify instance), create temporary instance with proper context. This is acceptable for backward compatibility.

4. **Code Deletion Timing**: Delete verification code AFTER successful verification to prevent replay attacks. Even if subsequent operations fail, the code should be deleted.

5. **Cookie Testing**: Fastify's inject method supports cookies via `cookies: { cookie_name: value }` object. Response cookies can be verified through `response.cookies` array.

6. **User Creation Pattern**: getOrCreateUser returns existing user OR creates new one with default values (displayName: '', timezone: 'UTC'). This eliminates the need for separate create/fetch logic.

7. **Error Code Consistency**: Use same error codes across endpoints (VALIDATION_ERROR, INVALID_CODE, INTERNAL_SERVER_ERROR) to maintain API consistency.

8. **Test Organization**: Group tests by concern (Success Cases, Validation Errors, Invalid Code Cases, Database Verification) for better maintainability.

### Next Steps
Task 12: Complete profile endpoint
- Add completeProfile handler to auth.controller.ts
- Register POST /auth/complete-profile route
- Apply authenticate middleware (requires JWT)
- Validate displayName (3-50 chars) and timezone (optional)
- Call AuthService.updateProfile()
- Re-generate JWT token with updated profile
- Set new httpOnly cookie
- Return updated user
- Write integration tests

---

## Iteration 12: Complete profile endpoint

**Status:** SUCCESS ✅

**Summary:** Implemented POST /auth/complete-profile endpoint with authentication, profile validation, user updates, JWT token regeneration, and comprehensive integration tests.

**Tests Run:**
- Integration tests: 13/13 passing (auth.complete-profile.test.ts)
- Unit tests: 43/43 passing (auth.service.test.ts)
- Type check: PASS (after TypeScript fix)
- Linting: PASS

**Files Modified:**
- Added completeProfile handler to `apps/api/src/controllers/auth.controller.ts` (lines 181-247)
- Added POST /complete-profile route to `apps/api/src/routes/auth.routes.ts` (lines 32-40)
- Fixed JWT cookie config in `apps/api/tests/helpers.ts` (lines 32-35)
- Created `apps/api/tests/integration/auth.complete-profile.test.ts` - 13 comprehensive tests

**Verification:**
- Valid profile data (displayName 3-50 chars) updates user successfully
- Timezone is optional (defaults to 'UTC' in database)
- JWT token regenerated with updated displayName in payload
- New httpOnly cookie set with updated token
- Authentication middleware properly protects endpoint (401 for missing/invalid tokens)
- Validation errors return 400 with appropriate messages
- Database verified: user actually updated with new profile data
- All 13 test scenarios pass

**Implementation Details:**

1. **TypeScript Fix Applied**: Initial implementation had type error with `exactOptionalPropertyTypes: true`. Fixed by using conditional object spread:
   ```typescript
   const updatedUser = await authService.updateProfile(userId, {
     displayName,
     ...(timezone !== undefined && { timezone }),
   });
   ```

2. **JWT Token Regeneration**: Creates new token with updated profile info:
   ```typescript
   const serviceWithFastify = new AuthService(request.server);
   const token = serviceWithFastify.generateToken(updatedUser);
   ```

3. **Cookie Settings**: Same security settings as verifyCode endpoint:
   ```typescript
   reply.setCookie('auth_token', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     path: '/',
     maxAge: 7 * 24 * 60 * 60, // 7 days
   });
   ```

4. **Route Protection**: Applied authenticate middleware via preHandler:
   ```typescript
   fastify.post('/complete-profile', {
     preHandler: authenticate
   }, authController.completeProfile);
   ```

**Key Learnings:**

1. **exactOptionalPropertyTypes Strictness**: With `exactOptionalPropertyTypes: true` in tsconfig, TypeScript differentiates between `timezone?: string` (truly optional) and `timezone: string | undefined` (required with undefined value). Zod's `.optional()` produces the latter. Solution: use conditional object spread to only include property when defined.

2. **Authenticated Endpoint Pattern**: Middleware populates `request.user` with decoded JWT payload. Access user ID via `request.user.sub`:
   ```typescript
   const userId = request.user.sub;
   ```

3. **Profile Validation**: Use existing `completeProfileSchema` from shared package with min(3) and max(50) for displayName. Timezone is optional string with no format validation.

4. **Test Helper Fix**: Added JWT cookie configuration to test helpers to match production server setup:
   ```typescript
   await fastify.register(jwt, {
     secret: testJWTSecret,
     cookie: {
       cookieName: 'auth_token',
       signed: false,
     },
   });
   ```
   This enables JWT extraction from cookies in tests, which is required for authenticate middleware to work.

5. **Testing Authenticated Endpoints**: Pattern for testing protected routes:
   ```typescript
   // Create test user
   const testUser = await db.insert(users).values({
     phoneNumber: '+1234567890',
     displayName: '', // Empty for profile completion test
     timezone: 'UTC',
   }).returning();

   // Generate valid JWT token
   const token = app.jwt.sign({
     sub: testUser[0].id,
     phone: testUser[0].phoneNumber,
   });

   // Make authenticated request
   const response = await app.inject({
     method: 'POST',
     url: '/api/auth/complete-profile',
     cookies: {
       auth_token: token,
     },
     payload: {
       displayName: 'John Doe',
       timezone: 'America/New_York',
     },
   });
   ```

6. **Cookie Verification in Tests**: Verify new cookie is set with updated JWT:
   ```typescript
   const cookies = response.cookies;
   const authCookie = cookies.find(c => c.name === 'auth_token');
   expect(authCookie).toBeDefined();
   expect(authCookie.value).toBeTruthy();
   expect(authCookie.httpOnly).toBe(true);
   ```

7. **Database Verification**: Always verify actual database changes:
   ```typescript
   const updatedUser = await db.query.users.findFirst({
     where: eq(users.id, testUser[0].id),
   });
   expect(updatedUser.displayName).toBe('John Doe');
   expect(updatedUser.timezone).toBe('America/New_York');
   ```

8. **Test Coverage**: Comprehensive test scenarios:
   - Success: with both displayName and timezone
   - Success: with only displayName (timezone optional)
   - Success: updating existing displayName
   - Validation: missing displayName
   - Validation: displayName too short (< 3 chars)
   - Validation: displayName too long (> 50 chars)
   - Validation: empty displayName string
   - Unauthorized: no token
   - Unauthorized: invalid token
   - Unauthorized: expired token
   - Database verification: actual DB updates
   - Database verification: other fields preserved

9. **Error Response Consistency**: Uses same error codes as other endpoints:
   - `VALIDATION_ERROR` (400): Invalid input
   - `UNAUTHORIZED` (401): Missing/invalid token
   - `INTERNAL_SERVER_ERROR` (500): Unexpected errors

10. **Pattern Consistency**: Follows exact same structure as verifyCode handler:
    - Validate with Zod safeParse()
    - Return 400 for validation errors
    - Try-catch for business logic
    - Log errors with context
    - Return 500 for unexpected errors
    - Consistent response format

**Code Review Outcome: APPROVED**

After TypeScript fix, implementation is production-ready:
- ✅ Pattern consistency with existing handlers
- ✅ Comprehensive test coverage (13/13 passing)
- ✅ Proper authentication middleware application
- ✅ Security best practices (JWT regeneration, secure cookies)
- ✅ Type safety (no compilation errors)
- ✅ Database verification in tests
- ✅ Error handling consistency

**Controller Implementation Pattern:**
```typescript
async completeProfile(request: FastifyRequest, reply: FastifyReply) {
  // 1. Validate request body
  const result = completeProfileSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: result.error.issues,
      },
    });
  }

  const { displayName, timezone } = result.data;

  try {
    // 2. Get user ID from authenticated request
    const userId = request.user.sub;

    // 3. Update profile via AuthService
    const updatedUser = await authService.updateProfile(userId, {
      displayName,
      ...(timezone !== undefined && { timezone }),
    });

    // 4. Generate new JWT token with updated profile
    const serviceWithFastify = new AuthService(request.server);
    const token = serviceWithFastify.generateToken(updatedUser);

    // 5. Set new httpOnly cookie
    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // 6. Return success with updated user
    return reply.status(200).send({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    request.log.error({ error, userId: request.user.sub }, 'Failed to complete profile');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to complete profile',
      },
    });
  }
}
```

### Next Steps
Task 13: Get current user and logout endpoints
- Add getMe handler to return current user from request.user
- Add logout handler to clear auth_token cookie
- Register GET /auth/me and POST /auth/logout routes
- Both require authenticate middleware
- Write integration tests (authenticated vs unauthenticated)

---

## Iteration 13: Task 13 - Get Current User and Logout Endpoints

**Status:** ✅ COMPLETE  
**Date:** 2026-02-02

### Implementation Summary

Successfully implemented GET /auth/me and POST /auth/logout endpoints with authentication middleware and comprehensive integration tests.

#### Files Changed

1. **Controller** (`apps/api/src/controllers/auth.controller.ts`)
   - Added `getMe` handler (lines 263-299)
   - Added `logout` handler (lines 312-335)
   - Both handlers follow existing patterns with proper error handling and logging

2. **Routes** (`apps/api/src/routes/auth.routes.ts`)
   - Registered GET /me with authenticate preHandler (lines 42-49)
   - Registered POST /logout with authenticate preHandler (lines 51-58)

3. **Service** (`apps/api/src/services/auth.service.ts`)
   - Added `getUserById` method to interface and implementation (lines 51-57, 207-220)
   - Enables fetching user by ID for getMe handler

4. **Tests** (`apps/api/tests/integration/auth.me-logout.test.ts`)
   - New test file with 11 passing tests
   - 6 tests for GET /me (success cases, unauthorized cases, edge cases)
   - 4 tests for POST /logout (success, cookie clearing, unauthorized)
   - 1 integration test (verify /me returns 401 after logout)

#### Implementation Details

**GET /auth/me:**
- Extracts user ID from `request.user.sub` (populated by authenticate middleware)
- Fetches fresh user data from database (not cached JWT payload)
- Returns 200 with `{ success: true, user: User }` on success
- Returns 401 if user not found in database
- Includes proper error handling and logging

**POST /auth/logout:**
- Clears `auth_token` cookie using `reply.clearCookie('auth_token', { path: '/' })`
- Returns 200 with `{ success: true, message: 'Logged out successfully' }`
- Simple and secure implementation

**getUserById Service Method:**
- Added to IAuthService interface for type safety
- Queries database by user ID using Drizzle ORM
- Returns User | null pattern
- Uses `.limit(1)` for efficiency

### Verification Results

#### Tests: ✅ PASS
- **New integration tests**: All 11 tests passing
  - GET /me: 6 tests (success, unauthorized, edge cases)
  - POST /logout: 4 tests (success, unauthorized)
  - Integration: 1 test (logout invalidates session)
- **Type checking**: No TypeScript errors
- **Linting**: No linting errors

#### Code Review: ✅ APPROVED

**Strengths:**
- Perfect pattern consistency with existing codebase
- Comprehensive test coverage (11/11 passing)
- Proper security implementation (authentication required)
- Fresh database queries for current user data
- Clean, readable, and well-documented code
- Excellent error handling with contextual logging
- Cookie clearing properly scoped with path

**Quality Metrics:**
- Pattern Adherence: 10/10
- Test Coverage: 10/10
- Type Safety: 10/10
- Documentation: 10/10
- Security: 10/10
- Error Handling: 10/10

**No issues found** - Implementation is production-ready.

### Key Learnings

1. **Fresh Data vs JWT Payload**: GET /me correctly fetches fresh user data from database rather than returning cached JWT payload. This ensures the latest profile information is returned.

2. **Cookie Clearing Pattern**: `reply.clearCookie()` requires the same `path` option that was used when setting the cookie to ensure proper removal.

3. **Service Layer Abstraction**: Added `getUserById` to service layer rather than putting database query directly in controller - maintains separation of concerns and enables reusability.

4. **Security Best Practice**: Returning 401 when user not found (even though JWT is valid) prevents leaking information about deleted users.

5. **Test Isolation**: Integration tests properly verify cookie behavior by checking response cookies array, not just status codes.

---

## Iteration 14: Frontend Auth Context and Provider

**Date:** 2026-02-02
**Task:** Task 14 - Frontend auth context and provider
**Status:** ✅ COMPLETE

### Summary

Successfully implemented the frontend authentication context and provider, creating a complete client-side authentication system that integrates with the backend auth API. The implementation includes a React context provider with all required authentication methods, comprehensive test coverage, and proper Next.js App Router architecture.

### Implementation Details

#### Files Created:
1. **`apps/web/src/app/providers/auth-provider.tsx`** - Main authentication provider
   - AuthContext with typed interface (user, loading, login, verify, completeProfile, logout, refetch)
   - useState for user (User | null) and loading (boolean)
   - useEffect to fetch user on mount via GET /auth/me
   - All API calls use `credentials: 'include'` for HTTP-only cookie auth
   - Error handling with optional chaining and fallback messages
   - Methods: login(), verify(), completeProfile(), logout(), refetch()

2. **`apps/web/src/app/providers/providers.tsx`** - Client-side wrapper component
   - Wraps AuthProvider to keep root layout as server component
   - Uses `'use client'` directive
   - Enables metadata export in root layout for SEO

3. **`apps/web/src/app/providers/auth-provider.test.tsx`** - Comprehensive test suite
   - 13 tests covering all authentication methods
   - Tests provider rendering, hook usage, and error handling
   - Uses vitest with @testing-library/react
   - Mock fetch API for isolated testing
   - All tests passing (13/13)

4. **`apps/web/vitest.config.ts`** - Vitest configuration
   - jsdom environment for React testing
   - Path aliases matching tsconfig.json
   - React plugin for JSX transformation

#### Files Modified:
1. **`apps/web/src/app/layout.tsx`** - Root layout (Server Component)
   - Restored metadata export for SEO (title, description)
   - Wrapped children with Providers component
   - Remains server component (no 'use client')

2. **`apps/web/package.json`** - Dependencies and configuration
   - Added `@tanstack/react-query: ^5.62.11`
   - Added test dependencies: vitest, @testing-library/react, jsdom
   - Added test scripts: `test` and `test:watch`
   - Updated lint script to ignore test files

3. **`apps/web/tsconfig.json`** - TypeScript configuration
   - Excluded test files from compilation

#### Authentication Flow:
1. **On Mount:** AuthProvider fetches user from GET /auth/me
   - If 401/error: Sets user to null (not authenticated)
   - If 200: Sets user from response
   - Sets loading to false when complete

2. **Login:** POST /auth/request-code
   - Sends phone number
   - Throws error if request fails

3. **Verify:** POST /auth/verify-code
   - Sends phone number and code
   - Returns {requiresProfile} boolean
   - Updates user state if profile is complete

4. **Complete Profile:** POST /auth/complete-profile
   - Sends displayName and optional timezone
   - Updates user state with complete profile

5. **Logout:** POST /auth/logout
   - Clears auth_token cookie
   - Clears local user state
   - Redirects to /login

6. **Refetch:** Alias for fetchUser()
   - Manually refresh user data from API

#### API Integration:
- **Base URL:** `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'`
- **Authentication:** HTTP-only cookie `auth_token` (7 days expiry)
- **Request Configuration:** All requests include `credentials: 'include'`
- **Error Handling:** Parse `errorData.error?.message` with fallback
- **Response Format:** Backend returns `{success: true/false, user?, error?}`

#### Type Safety:
- Uses `User` type from `@tripful/shared`
- Strict TypeScript types throughout
- Proper ReactNode imports
- Optional chaining for error handling

### Verification Results

#### Tests: ✅ PASS
- **Unit tests:** 13/13 passing
- **Test coverage:**
  - Provider renders children
  - Hook throws error outside provider
  - Fetches user on mount
  - Handles fetch user failure gracefully
  - All auth methods tested (login, verify, completeProfile, logout, refetch)
  - Error handling for all methods
  - State management validated

#### Static Analysis: ✅ PASS
- **Type checking:** No TypeScript errors
- **Linting:** No ESLint errors (after fixes)
- **Build:** Production build successful (1372ms compile time)

#### Architecture Review: ✅ APPROVED

**Strengths:**
- Clean server/client component boundaries
- Proper Next.js App Router architecture
- SEO-friendly metadata configuration
- Robust error handling with fallbacks
- Comprehensive test coverage
- Type-safe implementation
- Scalable provider pattern

**Code Quality Metrics:**
- Pattern Adherence: 10/10
- Test Coverage: 10/10
- Type Safety: 10/10
- Error Handling: 10/10
- Architecture: 10/10

### Issues Resolved

#### Round 1 Issues (Initial Implementation):
1. **CRITICAL:** Root layout was client component, removing metadata export
   - **Fixed:** Created separate Providers wrapper, restored server component layout
2. **MAJOR:** Missing React import for ReactNode type
   - **Fixed:** Added ReactNode import, changed React.ReactNode to ReactNode
3. **MAJOR:** Unused error variable in catch blocks
   - **Fixed:** Removed unused variable, simplified to `catch {`
4. **MAJOR:** Incorrect error response parsing
   - **Fixed:** Changed to `errorData.error?.message || 'Request failed'`

#### Round 2 Verification: ✅ ALL PASS
- All critical issues resolved
- No new issues introduced
- All verification checks passing

### Key Learnings

1. **Server/Client Component Separation**: In Next.js App Router, keep root layout as server component for metadata exports. Use a separate client wrapper component for providers that need 'use client' directive.

2. **Provider Pattern Best Practice**: Create a dedicated `providers.tsx` wrapper that combines all client-side providers. This makes it easy to add more providers (theme, query client, etc.) in the future.

3. **Error Handling Strategy**: Use optional chaining (`?.`) when accessing nested error properties from API responses, and always provide fallback error messages for robustness.

4. **HTTP-Only Cookies**: When using HTTP-only cookies for authentication, the frontend cannot access the JWT token. Must call /auth/me on mount to restore session state from the cookie.

5. **Test Configuration**: vitest requires proper path alias configuration matching tsconfig.json. Test files should be excluded from TypeScript compilation but included in test runs.

6. **React 19 Compatibility**: Some testing libraries like @testing-library/react-hooks have peer dependency mismatches with React 19, but tests still work correctly.

7. **SEO Considerations**: Metadata exports are critical for SEO. Converting root layout to client component removes this capability, so proper architecture planning is essential.

8. **Credentials Include**: All authenticated requests must include `credentials: 'include'` in fetch options to send HTTP-only cookies with cross-origin requests.

### Next Steps

Task 15: Login page with phone input
- Create `app/(auth)/login/page.tsx` with phone input form
- Add country code dropdown (default +1) using react-hook-form
- Validate phone number on blur with Zod schema
- Call useAuth().login() on submit
- Redirect to /verify?phone=<number> on success
- Show error toast for invalid phone or rate limit
- Apply auth layout styling from DESIGN.md
