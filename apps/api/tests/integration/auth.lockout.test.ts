import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { verificationCodes } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("POST /api/auth/verify-code - Account Lockout", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function insertCode(phoneNumber: string, code: string) {
    await db.insert(verificationCodes).values({
      phoneNumber,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  }

  async function sendVerify(phoneNumber: string, code: string) {
    return app.inject({
      method: "POST",
      url: "/api/auth/verify-code",
      payload: { phoneNumber, code },
    });
  }

  it("should lock account after 5 failed attempts", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phoneNumber, correctCode);

    // Make 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      const res = await sendVerify(phoneNumber, wrongCode);
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_CODE");
    }

    // 6th attempt should be locked
    const lockedRes = await sendVerify(phoneNumber, wrongCode);
    expect(lockedRes.statusCode).toBe(429);
    const lockedBody = JSON.parse(lockedRes.body);
    expect(lockedBody.error.code).toBe("ACCOUNT_LOCKED");
    expect(lockedBody.error.message).toMatch(/Too many failed attempts/);
    expect(lockedBody.error.message).toMatch(/minute/);
  });

  it("should reject correct code while locked", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phoneNumber, correctCode);

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Even the correct code should be rejected while locked
    const res = await sendVerify(phoneNumber, correctCode);
    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("should unlock after cooldown period expires", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phoneNumber, correctCode);

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Manually set lockedUntil to the past to simulate cooldown expiry
    await db
      .update(verificationCodes)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(verificationCodes.phoneNumber, phoneNumber));

    // Should now accept the correct code
    const res = await sendVerify(phoneNumber, correctCode);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it("should reset failed attempts on successful verification", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phoneNumber, correctCode);

    // Make 3 wrong attempts (not enough to lock)
    for (let i = 0; i < 3; i++) {
      const res = await sendVerify(phoneNumber, wrongCode);
      expect(res.statusCode).toBe(400);
    }

    // Verify failedAttempts is 3
    const [record] = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);
    expect(record.failedAttempts).toBe(3);

    // Successful verification should reset attempts
    const res = await sendVerify(phoneNumber, correctCode);
    expect(res.statusCode).toBe(200);

    // Code is deleted after success, so we can't check failedAttempts directly
    // But we verify it worked and didn't lock
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it("should not share lockout state between phone numbers", async () => {
    app = await buildApp();
    const phone1 = generateUniquePhone();
    const phone2 = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phone1, correctCode);
    await insertCode(phone2, correctCode);

    // Lock phone1
    for (let i = 0; i < 5; i++) {
      await sendVerify(phone1, wrongCode);
    }

    // phone1 should be locked
    const lockedRes = await sendVerify(phone1, correctCode);
    expect(lockedRes.statusCode).toBe(429);

    // phone2 should still work
    const okRes = await sendVerify(phone2, correctCode);
    expect(okRes.statusCode).toBe(200);
    expect(JSON.parse(okRes.body).success).toBe(true);
  });

  it("should reset lockout when requesting a new code", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const wrongCode = "999999";

    await insertCode(phoneNumber, "123456");

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Confirm locked
    const lockedRes = await sendVerify(phoneNumber, wrongCode);
    expect(lockedRes.statusCode).toBe(429);

    // Request a new code (simulates storeCode which resets lockout)
    const requestRes = await app.inject({
      method: "POST",
      url: "/api/auth/request-code",
      payload: { phoneNumber },
    });
    expect(requestRes.statusCode).toBe(200);

    // New code should work (fixed code is "123456" in test environment)
    const verifyRes = await sendVerify(phoneNumber, "123456");
    expect(verifyRes.statusCode).toBe(200);
    expect(JSON.parse(verifyRes.body).success).toBe(true);
  });

  it("should give fresh 5 attempts after lockout expires", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const correctCode = "123456";
    const wrongCode = "999999";

    await insertCode(phoneNumber, correctCode);

    // Lock the account
    for (let i = 0; i < 5; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Simulate lockout expiry
    await db
      .update(verificationCodes)
      .set({ lockedUntil: new Date(Date.now() - 1000) })
      .where(eq(verificationCodes.phoneNumber, phoneNumber));

    // Should get 4 more wrong attempts before locking again
    for (let i = 0; i < 4; i++) {
      const res = await sendVerify(phoneNumber, wrongCode);
      expect(res.statusCode).toBe(400);
    }

    // 5th wrong attempt after unlock should lock again
    const lockRes = await sendVerify(phoneNumber, wrongCode);
    expect(lockRes.statusCode).toBe(400);

    // 6th should be locked
    const lockedRes = await sendVerify(phoneNumber, wrongCode);
    expect(lockedRes.statusCode).toBe(429);
  });

  it("should track failed attempts in database", async () => {
    app = await buildApp();
    const phoneNumber = generateUniquePhone();
    const wrongCode = "999999";

    await insertCode(phoneNumber, "123456");

    // Make 3 wrong attempts
    for (let i = 0; i < 3; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Check database state
    const [record] = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);

    expect(record.failedAttempts).toBe(3);
    expect(record.lockedUntil).toBeNull();

    // Make 2 more wrong attempts to trigger lockout
    for (let i = 0; i < 2; i++) {
      await sendVerify(phoneNumber, wrongCode);
    }

    // Check database state — should be locked
    const [lockedRecord] = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);

    expect(lockedRecord.failedAttempts).toBe(5);
    expect(lockedRecord.lockedUntil).toBeInstanceOf(Date);
    expect(lockedRecord.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
