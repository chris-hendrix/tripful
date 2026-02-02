import type { FastifyInstance } from 'fastify';
import { authController } from '@/controllers/auth.controller.js';
import { smsRateLimitConfig } from '@/middleware/rate-limit.middleware.js';

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
    '/request-code',
    {
      preHandler: fastify.rateLimit(smsRateLimitConfig),
    },
    authController.requestCode
  );

  /**
   * POST /verify-code
   * Verify a code and authenticate user
   * No rate limiting applied
   */
  fastify.post('/verify-code', authController.verifyCode);
}
