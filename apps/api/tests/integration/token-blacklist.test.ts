import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users, blacklistedTokens } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("Token Blacklist Integration", () => {
  let app: FastifyInstance;
  let testUserId: string;

  afterEach(async () => {
    // Clean up blacklisted tokens first (FK constraint), then users
    if (testUserId) {
      await db
        .delete(blacklistedTokens)
        .where(eq(blacklistedTokens.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (app) {
      await app.close();
    }
  });

  it("should invalidate token after logout", async () => {
    app = await buildApp();

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Blacklist Test User",
        timezone: "UTC",
      })
      .returning();

    testUserId = testUser.id;

    // Generate token with jti
    const jti = randomUUID();
    const token = app.jwt.sign({
      sub: testUser.id,
      name: testUser.displayName,
      jti,
    });

    // Verify the token works before logout
    const meResponse1 = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: token },
    });
    expect(meResponse1.statusCode).toBe(200);

    // Logout with the token
    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { auth_token: token },
    });
    expect(logoutResponse.statusCode).toBe(200);

    // Try to use the same token after logout - should be rejected
    const meResponse2 = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: token },
    });
    expect(meResponse2.statusCode).toBe(401);

    const body = JSON.parse(meResponse2.body);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Token has been revoked",
      },
    });
  });

  it("should allow non-blacklisted token to work normally", async () => {
    app = await buildApp();

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Normal Token User",
        timezone: "UTC",
      })
      .returning();

    testUserId = testUser.id;

    // Generate token with jti (not blacklisted)
    const token = app.jwt.sign({
      sub: testUser.id,
      name: testUser.displayName,
      jti: randomUUID(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: token },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUser.id);
  });

  it("should allow re-login with fresh token after logout", async () => {
    app = await buildApp();

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Re-login Test User",
        timezone: "UTC",
      })
      .returning();

    testUserId = testUser.id;

    // Generate first token
    const firstToken = app.jwt.sign({
      sub: testUser.id,
      name: testUser.displayName,
      jti: randomUUID(),
    });

    // Logout with first token
    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { auth_token: firstToken },
    });
    expect(logoutResponse.statusCode).toBe(200);

    // First token should now be rejected
    const rejectedResponse = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: firstToken },
    });
    expect(rejectedResponse.statusCode).toBe(401);

    // Generate a new token (simulating re-login)
    const newToken = app.jwt.sign({
      sub: testUser.id,
      name: testUser.displayName,
      jti: randomUUID(),
    });

    // New token should work
    const meResponse = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: newToken },
    });
    expect(meResponse.statusCode).toBe(200);

    const body = JSON.parse(meResponse.body);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUser.id);
  });

  it("should handle double logout gracefully (idempotent)", async () => {
    app = await buildApp();

    // Create user and token with jti
    const jti = randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Double Logout User",
        timezone: "UTC",
      })
      .returning();

    testUserId = user.id;

    const token = app.jwt.sign({
      sub: user.id,
      name: user.displayName,
      jti,
    });

    // First logout
    const response1 = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { auth_token: token },
    });
    expect(response1.statusCode).toBe(200);

    // Second logout with same token - should not error with 500
    const response2 = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { auth_token: token },
    });
    // Second logout may return 401 (token already blacklisted) but must NOT return 500
    expect(response2.statusCode).not.toBe(500);
  });

  it("should allow tokens without jti for backward compatibility", async () => {
    app = await buildApp();

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: generateUniquePhone(),
        displayName: "Backward Compat User",
        timezone: "UTC",
      })
      .returning();

    testUserId = testUser.id;

    // Generate token WITHOUT jti (old-style token)
    const token = app.jwt.sign({
      sub: testUser.id,
      name: testUser.displayName,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { auth_token: token },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUser.id);
  });
});
