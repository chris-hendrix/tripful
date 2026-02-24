import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { generateUniquePhone } from "../test-utils.js";

describe("POST /api/auth/request-code", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should return 200 and send verification code for valid phone number", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {
          phoneNumber: generateUniquePhone(),
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: true,
        message: "Verification code sent",
      });
    });

    it("should accept phone numbers in various valid formats", async () => {
      app = await buildApp();

      const validPhoneNumbers = [
        generateUniquePhone(),
        "+442071838750",
        "+61291234567",
      ];

      for (const phoneNumber of validPhoneNumbers) {
        const response = await app.inject({
          method: "POST",
          url: "/api/auth/request-code",
          payload: {
            phoneNumber,
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      }
    });

    it("should handle resend for same phone number", async () => {
      app = await buildApp();

      const phoneNumber = generateUniquePhone();

      const response1 = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber },
      });

      expect(response1.statusCode).toBe(200);

      const response2 = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber },
      });

      expect(response2.statusCode).toBe(200);
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 when phoneNumber is missing", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: expect.any(Array),
        },
      });
    });

    it("should return 400 when phoneNumber is too short", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {
          phoneNumber: "+123",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when phoneNumber is too long", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {
          phoneNumber: "+123456789012345678901",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when phoneNumber has invalid format", async () => {
      app = await buildApp();

      const invalidPhoneNumbers = [
        "not-a-phone-number",
        "abcdefghijkl",
        "+1234567890123",
        "+99999999999999",
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        const response = await app.inject({
          method: "POST",
          url: "/api/auth/request-code",
          payload: {
            phoneNumber,
          },
        });

        expect(response.statusCode).toBe(400);

        const body = JSON.parse(response.body);
        expect(body).toMatchObject({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid phone number format",
          },
        });
      }
    });

    it("should return 400 with proper error structure for validation errors", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {
          phoneNumber: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);

      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
      expect(body.error).toHaveProperty("message");

      expect(Object.keys(body)).toEqual(["success", "error", "requestId"]);
    });
  });

  describe("Rate Limiting", () => {
    it("should allow 5 requests per phone number within time window", async () => {
      app = await buildApp();

      const phoneNumber = generateUniquePhone();

      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/api/auth/request-code",
          payload: { phoneNumber },
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).success).toBe(true);
      }
    });

    it("should reject 6th request with 429 RATE_LIMIT_EXCEEDED", async () => {
      app = await buildApp();

      const phoneNumber = generateUniquePhone();

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/api/auth/request-code",
          payload: { phoneNumber },
        });
      }

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber },
      });

      expect(response.statusCode).toBe(429);

      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many verification code requests. Please try again later.",
        },
      });
    });

    it("should track rate limits independently per phone number", async () => {
      app = await buildApp();

      const phoneNumber1 = generateUniquePhone();
      const phoneNumber2 = generateUniquePhone();

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/api/auth/request-code",
          payload: { phoneNumber: phoneNumber1 },
        });
      }

      const response1 = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber: phoneNumber1 },
      });

      expect(response1.statusCode).toBe(429);

      const response2 = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber: phoneNumber2 },
      });

      expect(response2.statusCode).toBe(200);
      expect(JSON.parse(response2.body).success).toBe(true);
    });
  });
});
