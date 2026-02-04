import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { authenticate, requireCompleteProfile } from '@/middleware/auth.middleware.js';
import { db } from '@/config/database.js';
import { users } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env.js';
import { errorHandler } from '@/middleware/error.middleware.js';
import { generateUniquePhone } from '../test-utils.js';

/**
 * Build a minimal Fastify app for testing middleware
 * We don't use buildApp() because we need to register routes before calling ready()
 */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
    cookie: { cookieName: 'auth_token' },
  });

  app.setErrorHandler(errorHandler);

  // Register test routes with middleware
  app.get('/test-auth', { preHandler: authenticate }, async (request) => {
    return {
      success: true,
      user: request.user,
    };
  });

  app.get(
    '/test-complete-profile',
    { preHandler: [authenticate, requireCompleteProfile] },
    async (request) => {
      return {
        success: true,
        user: request.user,
      };
    }
  );

  await app.ready();

  return app;
}

describe('Authentication Middleware', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('authenticate() middleware', () => {
    it('should accept valid token in cookie and populate request.user', async () => {
      app = await buildTestApp();

      // Create a test user
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: 'Test User',
          timezone: 'America/New_York',
        })
        .returning();

      const user = testUser[0];

      // Generate valid JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
        name: user.displayName,
      });

      // Make request with token in cookie
      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.sub).toBe(user.id);
      expect(body.user.phone).toBe(user.phoneNumber);

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should accept valid token in Authorization header and populate request.user', async () => {
      app = await buildTestApp();

      // Create a test user
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: 'Test User 2',
          timezone: 'UTC',
        })
        .returning();

      const user = testUser[0];

      // Generate valid JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
        name: user.displayName,
      });

      // Make request with token in Authorization header
      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.sub).toBe(user.id);
      expect(body.user.phone).toBe(user.phoneNumber);

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should return 401 UNAUTHORIZED when token is missing', async () => {
      app = await buildTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should return 401 UNAUTHORIZED when token format is invalid', async () => {
      app = await buildTestApp();

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          authorization: 'Bearer invalid.token.format',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    });

    it('should return 401 UNAUTHORIZED when token is expired', async () => {
      app = await buildTestApp();

      // Create a test user with unique phone number
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: 'Test User 3',
          timezone: 'UTC',
        })
        .returning();

      const user = testUser[0];

      try {
        // Generate JWT token with 1ms expiry
        const token = app.jwt.sign(
          {
            sub: user.id,
            phone: user.phoneNumber,
            name: user.displayName,
          },
          {
            expiresIn: '1ms', // Very short expiry
          }
        );

        // Wait for token to expire
        await new Promise((resolve) => setTimeout(resolve, 10));

        const response = await app.inject({
          method: 'GET',
          url: '/test-auth',
          cookies: {
            auth_token: token,
          },
        });

        expect(response.statusCode).toBe(401);

        const body = JSON.parse(response.body);
        expect(body).toEqual({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        });
      } finally {
        // Cleanup - always run even if test fails
        await db.delete(users).where(eq(users.id, user.id));
      }
    });

    it('should return 401 UNAUTHORIZED when token has wrong signature', async () => {
      app = await buildTestApp();

      // Create a token with a different secret
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicGhvbmUiOiIrMTIzNDU2Nzg5MCIsImlhdCI6MTUxNjIzOTAyMn0.wrongsignaturehere';

      const response = await app.inject({
        method: 'GET',
        url: '/test-auth',
        cookies: {
          auth_token: fakeToken,
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    });
  });

  describe('requireCompleteProfile() middleware', () => {
    it('should allow authenticated user with complete profile', async () => {
      app = await buildTestApp();

      // Create a test user with complete profile
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: 'Complete User',
          timezone: 'UTC',
        })
        .returning();

      const user = testUser[0];

      // Generate valid JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
        name: user.displayName,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-complete-profile',
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.sub).toBe(user.id);
      expect(body.user.phone).toBe(user.phoneNumber);

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should return 403 PROFILE_INCOMPLETE when user has empty displayName', async () => {
      app = await buildTestApp();

      // Create a test user with incomplete profile (empty displayName)
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: '', // Empty display name
          timezone: 'UTC',
        })
        .returning();

      const user = testUser[0];

      // Generate valid JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-complete-profile',
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message: 'Profile setup required. Please complete your profile.',
        },
      });

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should return 403 PROFILE_INCOMPLETE when user has whitespace-only displayName', async () => {
      app = await buildTestApp();

      // Create a test user with incomplete profile (whitespace-only displayName)
      const testUser = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: '   ', // Whitespace-only display name
          timezone: 'UTC',
        })
        .returning();

      const user = testUser[0];

      // Generate valid JWT token
      const token = app.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-complete-profile',
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message: 'Profile setup required. Please complete your profile.',
        },
      });

      // Cleanup
      await db.delete(users).where(eq(users.id, user.id));
    });

    it('should return 401 when unauthenticated request tries to access', async () => {
      app = await buildTestApp();

      // Make request without token
      const response = await app.inject({
        method: 'GET',
        url: '/test-complete-profile',
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    });
  });
});
