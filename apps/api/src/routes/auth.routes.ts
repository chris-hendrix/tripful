import type { FastifyInstance } from "fastify";
import { authController } from "@/controllers/auth.controller.js";
import { smsRateLimitConfig } from "@/middleware/rate-limit.middleware.js";
import { authenticate } from "@/middleware/auth.middleware.js";

/**
 * Authentication Routes
 * Registers all authentication-related endpoints
 *
 * @param fastify - Fastify instance
 */
export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /request-code
   * Request a verification code via SMS
   * Rate limited to 5 requests per phone number per hour
   */
  fastify.post(
    "/request-code",
    {
      preHandler: fastify.rateLimit(smsRateLimitConfig),
    },
    authController.requestCode,
  );

  /**
   * POST /verify-code
   * Verify a code and authenticate user
   * No rate limiting applied
   */
  fastify.post("/verify-code", authController.verifyCode);

  /**
   * POST /complete-profile
   * Complete user profile with display name and timezone
   * Requires authentication via JWT token
   */
  fastify.post(
    "/complete-profile",
    {
      preHandler: authenticate,
    },
    authController.completeProfile,
  );

  /**
   * GET /me
   * Get current authenticated user's profile information
   * Requires authentication via JWT token
   */
  fastify.get(
    "/me",
    {
      preHandler: authenticate,
    },
    authController.getMe,
  );

  /**
   * POST /logout
   * Logout user by clearing authentication cookie
   * Requires authentication via JWT token
   */
  fastify.post(
    "/logout",
    {
      preHandler: authenticate,
    },
    authController.logout,
  );
}
