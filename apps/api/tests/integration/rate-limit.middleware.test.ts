import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { smsRateLimitConfig } from "@/middleware/rate-limit.middleware.js";
import { errorHandler } from "@/middleware/error.middleware.js";
import { generateUniquePhone } from "../test-utils.js";

/**
 * Build a minimal Fastify app for testing rate limiting
 * We need to register the rate-limit plugin first, then apply route-specific config using preHandler
 */
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // Register rate-limit plugin with global: false
  // This allows us to apply rate limiting only on specific routes
  await app.register(rateLimit, {
    global: false,
  });

  app.setErrorHandler(errorHandler);

  // Register test route with SMS rate limiting using app.rateLimit() as preHandler
  app.post(
    "/test-sms-rate-limit",
    {
      preHandler: app.rateLimit(smsRateLimitConfig),
    },
    async (_request) => {
      return {
        success: true,
        message: "Request processed",
      };
    },
  );

  await app.ready();

  return app;
}

describe("Rate Limit Middleware", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("smsRateLimitConfig", () => {
    it("should allow 5 requests per phone number within the time window", async () => {
      app = await buildTestApp();

      const phoneNumber = generateUniquePhone();

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/test-sms-rate-limit",
          payload: {
            phoneNumber,
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.message).toBe("Request processed");
      }
    });

    it("should reject the 6th request with 429 status and RATE_LIMIT_EXCEEDED error", async () => {
      app = await buildTestApp();

      const phoneNumber = generateUniquePhone();

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/test-sms-rate-limit",
          payload: {
            phoneNumber,
          },
        });

        expect(response.statusCode).toBe(200);
      }

      // 6th request should be rate limited
      const response = await app.inject({
        method: "POST",
        url: "/test-sms-rate-limit",
        payload: {
          phoneNumber,
        },
      });

      expect(response.statusCode).toBe(429);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many verification code requests. Please try again later.",
        },
      });
    });

    it("should use IP address as fallback when phoneNumber is not provided", async () => {
      app = await buildTestApp();

      // Make 5 requests without phoneNumber - should use IP as key
      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/test-sms-rate-limit",
          payload: {
            // No phoneNumber provided
          },
        });

        expect(response.statusCode).toBe(200);
      }

      // 6th request should be rate limited based on IP
      const response = await app.inject({
        method: "POST",
        url: "/test-sms-rate-limit",
        payload: {
          // No phoneNumber provided
        },
      });

      expect(response.statusCode).toBe(429);

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many verification code requests. Please try again later.",
        },
      });
    });

    it("should track different phone numbers independently", async () => {
      app = await buildTestApp();

      const phoneNumber1 = generateUniquePhone();
      const phoneNumber2 = generateUniquePhone();

      // Make 5 requests for first phone number
      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/test-sms-rate-limit",
          payload: {
            phoneNumber: phoneNumber1,
          },
        });

        expect(response.statusCode).toBe(200);
      }

      // 6th request for first phone number should be rate limited
      const response1 = await app.inject({
        method: "POST",
        url: "/test-sms-rate-limit",
        payload: {
          phoneNumber: phoneNumber1,
        },
      });

      expect(response1.statusCode).toBe(429);

      // First request for second phone number should succeed (independent limit)
      const response2 = await app.inject({
        method: "POST",
        url: "/test-sms-rate-limit",
        payload: {
          phoneNumber: phoneNumber2,
        },
      });

      expect(response2.statusCode).toBe(200);

      const body2 = JSON.parse(response2.body);
      expect(body2.success).toBe(true);
      expect(body2.message).toBe("Request processed");
    });

    it("should return correct error response format", async () => {
      app = await buildTestApp();

      const phoneNumber = generateUniquePhone();

      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/test-sms-rate-limit",
          payload: {
            phoneNumber,
          },
        });
      }

      // 6th request should return properly formatted error
      const response = await app.inject({
        method: "POST",
        url: "/test-sms-rate-limit",
        payload: {
          phoneNumber,
        },
      });

      expect(response.statusCode).toBe(429);

      const body = JSON.parse(response.body);

      // Verify exact structure
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code", "RATE_LIMIT_EXCEEDED");
      expect(body.error).toHaveProperty(
        "message",
        "Too many verification code requests. Please try again later.",
      );

      // Ensure no extra properties
      expect(Object.keys(body)).toEqual(["success", "error"]);
      expect(Object.keys(body.error)).toEqual(["code", "message"]);
    });
  });
});
