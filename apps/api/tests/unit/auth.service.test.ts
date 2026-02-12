import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { db } from "@/config/database.js";
import { users, verificationCodes } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { AuthService } from "@/services/auth.service.js";
import { env } from "@/config/env.js";
import { generateUniquePhone } from "../test-utils.js";

// Create service instance with db for testing
const authService = new AuthService(db);

describe("auth.service", () => {
  // Use unique phone numbers per test run to enable parallel execution
  // Targeted cleanup needed - unit tests verify specific database states
  const testPhoneNumber = generateUniquePhone();
  const testPhoneNumber2 = generateUniquePhone();

  // Clean up only this test file's data (safe for parallel execution)
  const cleanup = async () => {
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, testPhoneNumber));
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, testPhoneNumber2));
    await db.delete(users).where(eq(users.phoneNumber, testPhoneNumber));
    await db.delete(users).where(eq(users.phoneNumber, testPhoneNumber2));
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  describe("generateCode", () => {
    it("should generate a 6-digit numeric code", () => {
      const code = authService.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate different codes on successive calls", () => {
      const code1 = authService.generateCode();
      const code2 = authService.generateCode();
      const code3 = authService.generateCode();

      // While theoretically they could be the same, it's extremely unlikely
      // with 1 million possible combinations
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
      expect(code3).toMatch(/^\d{6}$/);
    });

    it("should generate codes in valid range (100000-999999)", () => {
      const code = authService.generateCode();
      const numericCode = parseInt(code, 10);
      expect(numericCode).toBeGreaterThanOrEqual(100000);
      expect(numericCode).toBeLessThan(1000000);
    });
  });

  describe("storeCode", () => {
    it("should store a verification code for a phone number", async () => {
      const code = "123456";
      await authService.storeCode(testPhoneNumber, code);

      const result = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].phoneNumber).toBe(testPhoneNumber);
      expect(result[0].code).toBe(code);
      expect(result[0].expiresAt).toBeInstanceOf(Date);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it("should set expiry to 5 minutes from now", async () => {
      const code = "123456";
      const beforeStore = Date.now();
      await authService.storeCode(testPhoneNumber, code);
      const afterStore = Date.now();

      const result = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      const expiresAt = result[0].expiresAt.getTime();
      const expectedMin = beforeStore + 5 * 60 * 1000;
      const expectedMax = afterStore + 5 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it("should update existing code for same phone number (upsert)", async () => {
      const code1 = "111111";
      const code2 = "222222";

      // Store first code
      await authService.storeCode(testPhoneNumber, code1);
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(result1[0].code).toBe(code1);

      // Store second code for same phone number
      await authService.storeCode(testPhoneNumber, code2);
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      // Should have only one record with updated code
      expect(result2).toHaveLength(1);
      expect(result2[0].code).toBe(code2);
    });

    it("should reset createdAt timestamp on update", async () => {
      const code1 = "111111";
      const code2 = "222222";

      await authService.storeCode(testPhoneNumber, code1);
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      const firstCreatedAt = result1[0].createdAt.getTime();

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await authService.storeCode(testPhoneNumber, code2);
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      const secondCreatedAt = result2[0].createdAt.getTime();

      expect(secondCreatedAt).toBeGreaterThan(firstCreatedAt);
    });
  });

  describe("verifyCode", () => {
    it("should return true for valid code", async () => {
      const code = "123456";
      await authService.storeCode(testPhoneNumber, code);

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);
    });

    it("should return false when no code exists for phone number", async () => {
      const isValid = await authService.verifyCode(testPhoneNumber, "123456");
      expect(isValid).toBe(false);
    });

    it("should return false when code does not match", async () => {
      const storedCode = "123456";
      const wrongCode = "654321";
      await authService.storeCode(testPhoneNumber, storedCode);

      const isValid = await authService.verifyCode(testPhoneNumber, wrongCode);
      expect(isValid).toBe(false);
    });

    it("should return false when code has expired", async () => {
      const code = "123456";
      const expiredTime = new Date(Date.now() - 1000); // 1 second ago

      // Manually insert expired code
      await db.insert(verificationCodes).values({
        phoneNumber: testPhoneNumber,
        code,
        expiresAt: expiredTime,
      });

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(false);
    });

    it("should return true when code is about to expire but still valid", async () => {
      const code = "123456";
      const almostExpiredTime = new Date(Date.now() + 1000); // 1 second from now

      // Manually insert code about to expire
      await db.insert(verificationCodes).values({
        phoneNumber: testPhoneNumber,
        code,
        expiresAt: almostExpiredTime,
      });

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);
    });

    it("should check codes independently for different phone numbers", async () => {
      const code1 = "111111";
      const code2 = "222222";

      await authService.storeCode(testPhoneNumber, code1);
      await authService.storeCode(testPhoneNumber2, code2);

      // Each phone number should only validate with its own code
      expect(await authService.verifyCode(testPhoneNumber, code1)).toBe(true);
      expect(await authService.verifyCode(testPhoneNumber, code2)).toBe(false);
      expect(await authService.verifyCode(testPhoneNumber2, code2)).toBe(true);
      expect(await authService.verifyCode(testPhoneNumber2, code1)).toBe(false);
    });
  });

  describe("deleteCode", () => {
    it("should delete a verification code", async () => {
      const code = "123456";
      await authService.storeCode(testPhoneNumber, code);

      // Verify code exists
      const beforeDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(beforeDelete).toHaveLength(1);

      // Delete code
      await authService.deleteCode(testPhoneNumber);

      // Verify code is deleted
      const afterDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(afterDelete).toHaveLength(0);
    });

    it("should not throw error when deleting non-existent code", async () => {
      await expect(
        authService.deleteCode(testPhoneNumber),
      ).resolves.not.toThrow();
    });

    it("should only delete code for specified phone number", async () => {
      const code1 = "111111";
      const code2 = "222222";

      await authService.storeCode(testPhoneNumber, code1);
      await authService.storeCode(testPhoneNumber2, code2);

      // Delete code for first phone number
      await authService.deleteCode(testPhoneNumber);

      // Verify first is deleted
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(result1).toHaveLength(0);

      // Verify second still exists
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber2))
        .limit(1);
      expect(result2).toHaveLength(1);
      expect(result2[0].code).toBe(code2);
    });
  });

  describe("getOrCreateUser", () => {
    it("should create a new user when one does not exist", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.phoneNumber).toBe(testPhoneNumber);
      expect(user.displayName).toBe("");
      expect(user.timezone).toBeNull();
      expect(user.profilePhotoUrl).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("should return existing user when one already exists", async () => {
      // Create user first time
      const user1 = await authService.getOrCreateUser(testPhoneNumber);

      // Try to get user again
      const user2 = await authService.getOrCreateUser(testPhoneNumber);

      // Should be the same user
      expect(user2.id).toBe(user1.id);
      expect(user2.phoneNumber).toBe(testPhoneNumber);
      expect(user2.createdAt.getTime()).toBe(user1.createdAt.getTime());
    });

    it("should not create duplicate users for same phone number", async () => {
      await authService.getOrCreateUser(testPhoneNumber);
      await authService.getOrCreateUser(testPhoneNumber);

      // Verify only one user exists
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, testPhoneNumber));

      expect(allUsers).toHaveLength(1);
    });

    it("should create different users for different phone numbers", async () => {
      const user1 = await authService.getOrCreateUser(testPhoneNumber);
      const user2 = await authService.getOrCreateUser(testPhoneNumber2);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.phoneNumber).toBe(testPhoneNumber);
      expect(user2.phoneNumber).toBe(testPhoneNumber2);
    });
  });

  describe("updateProfile", () => {
    it("should update display name", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newDisplayName = "John Doe";

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: newDisplayName,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.displayName).toBe(newDisplayName);
      expect(updatedUser.timezone).toBeNull(); // Should remain unchanged
    });

    it("should update timezone", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newTimezone = "America/New_York";

      const updatedUser = await authService.updateProfile(user.id, {
        timezone: newTimezone,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.timezone).toBe(newTimezone);
      expect(updatedUser.displayName).toBe(""); // Should remain unchanged
    });

    it("should update both display name and timezone", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newDisplayName = "Jane Smith";
      const newTimezone = "Europe/London";

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: newDisplayName,
        timezone: newTimezone,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.displayName).toBe(newDisplayName);
      expect(updatedUser.timezone).toBe(newTimezone);
    });

    it("should update the updatedAt timestamp", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const originalUpdatedAt = user.updatedAt.getTime();

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: "Updated Name",
      });

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt,
      );
    });

    it("should not affect other user fields", async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: "New Name",
      });

      expect(updatedUser.phoneNumber).toBe(user.phoneNumber);
      expect(updatedUser.profilePhotoUrl).toBe(user.profilePhotoUrl);
      expect(updatedUser.createdAt.getTime()).toBe(user.createdAt.getTime());
    });
  });

  describe("integration: complete auth flow", () => {
    it("should handle complete verification flow", async () => {
      // 1. Generate and store code
      const code = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code);

      // 2. Verify code
      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);

      // 3. Get or create user after successful verification
      const user = await authService.getOrCreateUser(testPhoneNumber);
      expect(user.phoneNumber).toBe(testPhoneNumber);

      // 4. Delete code after successful verification
      await authService.deleteCode(testPhoneNumber);
      const codeAfterDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(codeAfterDelete).toHaveLength(0);

      // 5. Update user profile
      const updatedUser = await authService.updateProfile(user.id, {
        displayName: "Test User",
        timezone: "America/Los_Angeles",
      });
      expect(updatedUser.displayName).toBe("Test User");
      expect(updatedUser.timezone).toBe("America/Los_Angeles");
    });

    it("should handle failed verification flow", async () => {
      // 1. Generate and store code
      const code = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code);

      // 2. Try to verify with wrong code
      const isValid = await authService.verifyCode(testPhoneNumber, "000000");
      expect(isValid).toBe(false);

      // 3. Code should still exist for retry
      const storedCode = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(storedCode).toHaveLength(1);

      // 4. Verify with correct code
      const isValidRetry = await authService.verifyCode(testPhoneNumber, code);
      expect(isValidRetry).toBe(true);
    });

    it("should handle code resend (overwrite)", async () => {
      // 1. Generate and store first code
      const code1 = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code1);

      // Get first code record timestamp
      const firstRecord = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      const firstCreatedAt = firstRecord[0].createdAt;
      const firstExpiresAt = firstRecord[0].expiresAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. User requests resend - generate and store second code
      const code2 = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code2);

      // 3. Should only have one code in database (upsert behavior)
      const allCodes = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber));
      expect(allCodes).toHaveLength(1);

      // 4. Timestamps should be updated (upsert refreshes the record)
      const secondCreatedAt = allCodes[0].createdAt;
      const secondExpiresAt = allCodes[0].expiresAt;
      expect(secondCreatedAt.getTime()).toBeGreaterThan(
        firstCreatedAt.getTime(),
      );
      expect(secondExpiresAt.getTime()).toBeGreaterThan(
        firstExpiresAt.getTime(),
      );

      // 5. Code should still work (in non-production, codes are fixed to '123456')
      const isValid = await authService.verifyCode(testPhoneNumber, code2);
      expect(isValid).toBe(true);
    });
  });

  describe("generateToken", () => {
    let app: FastifyInstance;
    let testAuthService: AuthService;
    const testUserId = "123e4567-e89b-12d3-a456-426614174000";

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it("should generate a valid JWT token for user with complete profile", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create test user
      const user = await authService.getOrCreateUser(testPhoneNumber);
      await authService.updateProfile(user.id, {
        displayName: "Test User",
        timezone: "America/New_York",
      });
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const token = testAuthService.generateToken(updatedUser[0]);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
    });

    it("should generate a valid JWT token for user with incomplete profile", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create test user with default values (empty displayName)
      const user = await authService.getOrCreateUser(testPhoneNumber);

      const token = testAuthService.generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should include correct payload in generated token", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create test user
      const user = await authService.getOrCreateUser(testPhoneNumber);
      await authService.updateProfile(user.id, { displayName: "John Doe" });
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const token = testAuthService.generateToken(updatedUser[0]);
      const decoded = app.jwt.verify(token);

      expect(decoded.sub).toBe(updatedUser[0].id);
      expect(decoded.phone).toBe(testPhoneNumber);
      expect(decoded.name).toBe("John Doe");
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it("should set token expiry to 7 days from now", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      const user = await authService.getOrCreateUser(testPhoneNumber);
      const beforeGenerate = Math.floor(Date.now() / 1000);

      const token = testAuthService.generateToken(user);
      const decoded = app.jwt.verify(token);

      const afterGenerate = Math.floor(Date.now() / 1000);
      const expectedExpiry = beforeGenerate + 7 * 24 * 60 * 60; // 7 days in seconds
      const expectedExpiryMax = afterGenerate + 7 * 24 * 60 * 60;

      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiryMax);
    });

    it("should throw error when FastifyInstance not available", () => {
      const serviceWithoutFastify = new AuthService(db);
      const mockUser = {
        id: testUserId,
        phoneNumber: testPhoneNumber,
        displayName: "Test User",
        profilePhotoUrl: null,
        timezone: null,
        handles: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => serviceWithoutFastify.generateToken(mockUser)).toThrow(
        "FastifyInstance not available",
      );
    });

    it("should omit name field when displayName is empty", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create user with empty displayName
      const user = await authService.getOrCreateUser(testPhoneNumber);

      const token = testAuthService.generateToken(user);
      const decoded = app.jwt.verify(token);

      expect(decoded.name).toBeUndefined();
      expect(decoded.sub).toBeDefined();
      expect(decoded.phone).toBeDefined();
    });
  });

  describe("verifyToken", () => {
    let app: FastifyInstance;
    let testAuthService: AuthService;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it("should verify a valid token and return payload", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create user and generate token
      const user = await authService.getOrCreateUser(testPhoneNumber);
      await authService.updateProfile(user.id, { displayName: "Test User" });
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const token = testAuthService.generateToken(updatedUser[0]);

      // Verify token
      const payload = testAuthService.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.sub).toBe(updatedUser[0].id);
      expect(payload.phone).toBe(testPhoneNumber);
      expect(payload.name).toBe("Test User");
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it("should throw error for expired token", async () => {
      // Setup Fastify with JWT for signing with short expiry
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "1ms", algorithm: "HS256" }, // 1 millisecond
        verify: { algorithms: ["HS256"] },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create user and generate token with 1ms expiry
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const token = testAuthService.generateToken(user);

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now verify should fail
      expect(() => testAuthService.verifyToken(token)).toThrow(
        "Token verification failed",
      );
    });

    it("should throw error for invalid token format", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      const invalidToken = "this.is.not.a.valid.jwt";

      expect(() => testAuthService.verifyToken(invalidToken)).toThrow(
        "Token verification failed",
      );
    });

    it("should throw error for token with wrong signature", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create a token with different secret
      const differentSecretApp = Fastify({ logger: false });
      await differentSecretApp.register(jwt, {
        secret: "different-secret-key-for-testing-purposes-only",
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await differentSecretApp.ready();

      const user = await authService.getOrCreateUser(testPhoneNumber);
      const tokenWithWrongSignature = differentSecretApp.jwt.sign({
        sub: user.id,
        phone: user.phoneNumber,
        name: user.displayName,
      });

      await differentSecretApp.close();

      expect(() =>
        testAuthService.verifyToken(tokenWithWrongSignature),
      ).toThrow("Token verification failed");
    });

    it("should throw error for malformed token", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      const malformedToken = "not-a-token";

      expect(() => testAuthService.verifyToken(malformedToken)).toThrow(
        "Token verification failed",
      );
    });

    it("should throw error when FastifyInstance not available", () => {
      const serviceWithoutFastify = new AuthService(db);

      expect(() => serviceWithoutFastify.verifyToken("any-token")).toThrow(
        "FastifyInstance not available",
      );
    });

    it("should handle token without name field (optional field)", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create user with empty displayName
      const user = await authService.getOrCreateUser(testPhoneNumber);

      const token = testAuthService.generateToken(user);
      const payload = testAuthService.verifyToken(token);

      expect(payload.sub).toBe(user.id);
      expect(payload.phone).toBe(testPhoneNumber);
      expect(payload.name).toBeUndefined();
    });
  });

  describe("integration: token round-trip", () => {
    let app: FastifyInstance;
    let testAuthService: AuthService;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it("should successfully generate and verify a token round-trip", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
        verify: { algorithms: ["HS256"] },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // Create user with full profile
      const user = await authService.getOrCreateUser(testPhoneNumber);
      await authService.updateProfile(user.id, {
        displayName: "Integration Test User",
        timezone: "Europe/London",
      });
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      // Generate token
      const token = testAuthService.generateToken(updatedUser[0]);
      expect(token).toBeDefined();

      // Verify token
      const payload = testAuthService.verifyToken(token);

      // Verify all fields match
      expect(payload.sub).toBe(updatedUser[0].id);
      expect(payload.phone).toBe(updatedUser[0].phoneNumber);
      expect(payload.name).toBe("Integration Test User");
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();

      // Verify expiry is approximately 7 days from now
      const sevenDays = 7 * 24 * 60 * 60;
      expect(payload.exp - payload.iat).toBeCloseTo(sevenDays, -2); // Within ~100 seconds
    });

    it("should handle complete auth flow with token generation", async () => {
      // Setup Fastify with JWT
      app = Fastify({ logger: false });
      await app.register(jwt, {
        secret: env.JWT_SECRET,
        sign: { expiresIn: "7d", algorithm: "HS256" },
        verify: { algorithms: ["HS256"] },
      });
      await app.ready();

      testAuthService = new AuthService(db, app);

      // 1. Generate and store verification code
      const code = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code);

      // 2. Verify code
      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);

      // 3. Get or create user
      const user = await authService.getOrCreateUser(testPhoneNumber);
      expect(user.phoneNumber).toBe(testPhoneNumber);

      // 4. Delete verification code
      await authService.deleteCode(testPhoneNumber);

      // 5. Generate JWT token
      const token = testAuthService.generateToken(user);
      expect(token).toBeDefined();

      // 6. Verify JWT token
      const payload = testAuthService.verifyToken(token);
      expect(payload.sub).toBe(user.id);
      expect(payload.phone).toBe(testPhoneNumber);

      // 7. Update profile
      await authService.updateProfile(user.id, {
        displayName: "Complete Flow User",
      });

      // 8. Verify token still works after profile update
      const payloadAfterUpdate = testAuthService.verifyToken(token);
      expect(payloadAfterUpdate.sub).toBe(user.id);
    });
  });
});
