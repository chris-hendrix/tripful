# Phase 2: SMS Authentication - Architecture

## Overview

Implement phone-based authentication system with SMS verification codes, JWT token management, and user profile creation. This is the foundation for all user-facing features.

## Goals

- Enable users to authenticate using phone numbers
- Generate and validate 6-digit SMS verification codes
- Issue and verify JWT tokens for session management
- Create user profiles with display names
- Protect API endpoints with authentication middleware
- Implement rate limiting to prevent SMS abuse

## Technical Approach

### Backend Architecture

#### 1. Database Schema

**Users Table**
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Verification Codes Table**
```typescript
export const verificationCodes = pgTable('verification_codes', {
  phoneNumber: varchar('phone_number', { length: 20 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Indexes:**
- `users.phone_number` - Unique index for phone lookups
- `verification_codes.expires_at` - For cleanup queries

#### 2. API Endpoints

**POST /api/auth/request-code**
- Body: `{ phoneNumber: string }`
- Validates phone number with libphonenumber-js
- Generates 6-digit random code
- Stores code in DB with 5-minute expiry
- Logs code to console (mock SMS)
- Returns: `{ success: true, message: "Code sent" }`
- Rate limit: 5 requests per phone per hour

**POST /api/auth/verify-code**
- Body: `{ phoneNumber: string, code: string }`
- Verifies code from DB (checks expiry)
- Creates or fetches user by phone number
- Returns: `{ token: string, user: User, requiresProfile: boolean }`
- Sets httpOnly cookie with JWT
- Deletes code from DB after verification

**POST /api/auth/complete-profile**
- Body: `{ displayName: string, timezone?: string }`
- Requires valid JWT (no display name yet)
- Updates user with display name and timezone
- Returns: `{ user: User }`
- Re-issues JWT with complete profile

**GET /api/auth/me**
- Requires JWT authentication
- Returns: `{ user: User }`
- Used to restore session on page load

**POST /api/auth/logout**
- Clears httpOnly cookie
- Returns: `{ success: true }`

#### 3. Services

**AuthService** (`src/services/auth.service.ts`)
```typescript
class AuthService {
  // Generate random 6-digit code
  generateCode(): string;

  // Store code in DB with 5-min expiry
  async storeCode(phoneNumber: string, code: string): Promise<void>;

  // Verify code (check exists + not expired)
  async verifyCode(phoneNumber: string, code: string): Promise<boolean>;

  // Delete code after successful verification
  async deleteCode(phoneNumber: string): Promise<void>;

  // Get or create user by phone number
  async getOrCreateUser(phoneNumber: string): Promise<User>;

  // Update user profile
  async updateProfile(userId: string, data: { displayName: string, timezone?: string }): Promise<User>;

  // Generate JWT token
  generateToken(user: User): string;

  // Verify JWT token
  verifyToken(token: string): JWTPayload;
}
```

**SMS Service** (`src/services/sms.service.ts`)
```typescript
interface ISMSService {
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
}

// Mock implementation for MVP
class MockSMSService implements ISMSService {
  async sendVerificationCode(phoneNumber: string, code: string) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📱 SMS Verification Code`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Code: ${code}`);
    console.log(`Expires: 5 minutes`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
}
```

**Phone Validation** (`src/utils/phone.ts`)
```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  e164?: string;
  error?: string
} {
  try {
    if (!isValidPhoneNumber(phone)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    const parsed = parsePhoneNumber(phone);
    return {
      isValid: true,
      e164: parsed.number
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'Invalid phone number format'
    };
  }
}
```

#### 4. Middleware

**Authentication Middleware** (`src/middleware/auth.middleware.ts`)
```typescript
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Extract token from cookie
    const token = request.cookies['auth_token'];

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authentication token',
        },
      });
    }

    // Verify token using Fastify JWT plugin
    const decoded = await request.server.jwt.verify<JWTPayload>(token);

    // Attach user info to request
    request.user = {
      id: decoded.sub,
      phoneNumber: decoded.phone,
    };
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}

// Optional: Middleware for incomplete profiles
export async function requireCompleteProfile(request: FastifyRequest, reply: FastifyReply) {
  // User must be authenticated first
  if (!request.user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  // Fetch user from DB to check profile completion
  const user = await db.query.users.findFirst({
    where: eq(users.id, request.user.id),
  });

  if (!user || !user.displayName) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'PROFILE_INCOMPLETE',
        message: 'Please complete your profile',
      },
    });
  }
}
```

**Rate Limiting** (`src/middleware/rate-limit.middleware.ts`)
```typescript
import rateLimit from '@fastify/rate-limit';

// Configure rate limiting plugin
export const smsRateLimitConfig = {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (request: FastifyRequest) => {
    // Rate limit per phone number
    const { phoneNumber } = request.body as { phoneNumber: string };
    return phoneNumber || request.ip;
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

#### 5. JWT Configuration

**JWT Token Structure**
```typescript
interface JWTPayload {
  sub: string;        // User ID
  phone: string;      // Phone number (for quick lookups)
  name?: string;      // Display name (if set)
  iat: number;        // Issued at
  exp: number;        // Expires at (7 days)
}
```

**JWT Setup** (`src/config/jwt.ts`)
```typescript
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

export function ensureJWTSecret(): string {
  const envLocalPath = '.env.local';

  // Check if JWT_SECRET exists in environment
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Try to read from .env.local
  if (existsSync(envLocalPath)) {
    const content = readFileSync(envLocalPath, 'utf-8');
    const match = content.match(/^JWT_SECRET=(.+)$/m);
    if (match) {
      return match[1];
    }
  }

  // Generate new secret
  const secret = randomBytes(64).toString('hex');

  // Append to .env.local
  const line = `\nJWT_SECRET=${secret}\n`;
  writeFileSync(envLocalPath, line, { flag: 'a' });

  console.log('✓ Generated JWT secret and saved to .env.local');

  return secret;
}
```

**Fastify JWT Plugin Setup** (`src/server.ts`)
```typescript
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

// Register cookie plugin (required for httpOnly cookies)
await fastify.register(cookie);

// Register JWT plugin
await fastify.register(jwt, {
  secret: ensureJWTSecret(),
  sign: {
    expiresIn: '7d',
  },
  cookie: {
    cookieName: 'auth_token',
    signed: false,
  },
});
```

#### 6. Error Handling

**Error Codes**
- `VALIDATION_ERROR` - Invalid input (phone format, missing fields)
- `UNAUTHORIZED` - Missing or invalid JWT token
- `INVALID_CODE` - Wrong verification code or expired
- `RATE_LIMIT_EXCEEDED` - Too many SMS requests
- `PROFILE_INCOMPLETE` - User needs to set display name

**Error Response Format**
```typescript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'User-friendly message',
    details?: any // Optional validation details
  }
}
```

### Frontend Architecture

#### 1. Page Structure

**Login Page** (`app/(auth)/login/page.tsx`)
- Phone number input with country code dropdown
- Country code defaults to +1 (US)
- Validates phone on blur
- Submits to POST /api/auth/request-code
- Redirects to /verify on success

**Verification Page** (`app/(auth)/verify/page.tsx`)
- Shows phone number from query param or state
- 6-digit code input (monospace, centered)
- Auto-focuses on mount
- Submits to POST /api/auth/verify-code
- If `requiresProfile: true`, redirect to /complete-profile
- Else redirect to /dashboard
- "Change number" link to go back
- "Resend code" link to request new code

**Complete Profile Page** (`app/(auth)/complete-profile/page.tsx`)
- Display name input (required, 3-50 chars)
- Timezone selector (optional, defaults to browser timezone)
- Submits to POST /api/auth/complete-profile
- Redirects to /dashboard on success
- Must be authenticated but not have display name set

#### 2. Auth Context

**Auth Provider** (`app/providers/auth-provider.tsx`)
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  phoneNumber: string
  displayName: string
  timezone: string
  profilePhotoUrl?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (phoneNumber: string) => Promise<void>
  verify: (phoneNumber: string, code: string) => Promise<{ requiresProfile: boolean }>
  completeProfile: (data: { displayName: string, timezone?: string }) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Fetch current user on mount
  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(phoneNumber: string) {
    const response = await fetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error.message)
    }
  }

  async function verify(phoneNumber: string, code: string) {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phoneNumber, code }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error.message)
    }

    const data = await response.json()

    if (!data.requiresProfile) {
      setUser(data.user)
    }

    return { requiresProfile: data.requiresProfile }
  }

  async function completeProfile(profileData: { displayName: string, timezone?: string }) {
    const response = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileData),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error.message)
    }

    const data = await response.json()
    setUser(data.user)
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      verify,
      completeProfile,
      logout,
      refetch: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

#### 3. Protected Routes

**Route Middleware** (`app/(app)/layout.tsx`)
```typescript
'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
```

#### 4. API Client

**Fetch Wrapper** (`lib/api.ts`)
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export class APIError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new APIError(data.error.code, data.error.message)
  }

  return data
}
```

### Shared Package

**Validation Schemas** (`shared/schemas/auth.ts`)
```typescript
import { z } from 'zod'

export const requestCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
})

export const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export const completeProfileSchema = z.object({
  displayName: z.string().min(3).max(50),
  timezone: z.string().optional(),
})

export type RequestCodeInput = z.infer<typeof requestCodeSchema>
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>
```

**User Types** (`shared/types/user.ts`)
```typescript
export interface User {
  id: string
  phoneNumber: string
  displayName: string
  profilePhotoUrl?: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
  requiresProfile: boolean
}
```

## Dependencies to Add

**Backend:**
- `libphonenumber-js` - Phone number validation
- `@fastify/cookie` - Cookie management for httpOnly cookies

**Frontend:**
- `@tanstack/react-query` - Data fetching and caching (already in architecture, add to package.json)

## Database Migrations

**Migration: Create users and verification_codes tables**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  profile_photo_url TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone_number ON users(phone_number);

CREATE TABLE verification_codes (
  phone_number VARCHAR(20) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

## Environment Variables

**Backend (.env or .env.local)**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tripful

# JWT (auto-generated if not set)
JWT_SECRET=<auto-generated-64-char-hex>

# Server
PORT=8000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Existing Patterns to Follow

From Phase 1 infrastructure:
- Use Drizzle ORM for database queries
- Follow controller → service → database layer pattern
- Use Zod for validation at API boundaries
- Error handling with try-catch and reply.status()
- Vitest for unit and integration tests
- TypeScript strict mode

## Success Criteria

- User can request verification code by entering phone number
- Code is logged to console (mock SMS)
- User can verify code and complete profile
- JWT token is issued and stored in httpOnly cookie
- Protected routes redirect to /login if not authenticated
- Rate limiting prevents SMS abuse (5 per hour per phone)
- All endpoints have proper error handling
- Unit tests for AuthService methods
- Integration tests for auth endpoints
- E2E test for full auth flow
