import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";
import { buildApp as buildAppDirect } from "@/app.js";

describe("Security & Schema Validation", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Schema Validation", () => {
    it("should return 400 for invalid UUID in trip ID param", async () => {
      app = await buildApp();

      // Create a valid JWT token for auth
      const token = app.jwt.sign({
        sub: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/trips/not-a-uuid",
        cookies: { auth_token: token },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid request data");
      expect(body.error.details).toBeDefined();
    });

    it("should return 400 for missing phoneNumber in request-code", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.details).toBeDefined();
    });

    it("should return 400 for missing required body fields in verify-code", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/verify-code",
        payload: { phoneNumber: "+11234567890" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid body in complete-profile", async () => {
      app = await buildApp();

      const token = app.jwt.sign({
        sub: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/complete-profile",
        cookies: { auth_token: token },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Security Headers", () => {
    it("should include security headers from helmet", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });

      // Helmet adds various security headers
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });

    it("should include Content-Security-Policy header", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });

      const csp = response.headers["content-security-policy"];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should include Cache-Control and Pragma headers on auth responses", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: { phoneNumber: "+11234567890" },
      });

      expect(response.headers["cache-control"]).toBe(
        "no-store, no-cache, must-revalidate",
      );
      expect(response.headers["pragma"]).toBe("no-cache");
    });

    it("should include Strict-Transport-Security header", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });

      const hsts = response.headers["strict-transport-security"];
      expect(hsts).toBeDefined();
      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
    });
  });

  describe("Not-Found Handler", () => {
    it("should return 404 for unknown routes", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/nonexistent",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", false);
      expect(body.error).toHaveProperty("code", "NOT_FOUND");
      expect(body.error.message).toContain(
        "Route GET /api/nonexistent not found",
      );
    });

    it("should return 404 for unknown methods on existing routes", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/health",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Rate Limiting", () => {
    it("should rate limit verify-code endpoint", async () => {
      // Build app with global rate limit disabled but route-specific enabled
      const rateLimitApp = await buildAppDirect({
        fastify: { logger: false },
        rateLimit: { global: false },
      });
      await rateLimitApp.ready();

      try {
        // Make 10 requests to reach the verify-code limit
        for (let i = 0; i < 10; i++) {
          await rateLimitApp.inject({
            method: "POST",
            url: "/api/auth/verify-code",
            payload: { phoneNumber: "+19876543210", code: "000000" },
          });
        }

        // 11th request should be rate limited
        const response = await rateLimitApp.inject({
          method: "POST",
          url: "/api/auth/verify-code",
          payload: { phoneNumber: "+19876543210", code: "000000" },
        });

        expect(response.statusCode).toBe(429);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(body.error.message).toContain("Too many verification attempts");
      } finally {
        await rateLimitApp.close();
      }
    });
  });

  describe("Error Envelope", () => {
    it("should return consistent error envelope for all errors", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);

      // All errors should follow the { success, error: { code, message } } shape
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
    });

    it("should include requestId in error responses", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/request-code",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("requestId");
      expect(typeof body.requestId).toBe("string");
    });

    it("should include requestId in 404 responses", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/api/nonexistent",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("requestId");
      expect(typeof body.requestId).toBe("string");
    });
  });
});
