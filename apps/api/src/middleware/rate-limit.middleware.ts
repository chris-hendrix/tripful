import type { RateLimitOptions } from '@fastify/rate-limit';
import type { FastifyRequest } from 'fastify';

/**
 * Rate limiting configuration for SMS verification code requests.
 *
 * Limits each phone number to 5 verification code requests per hour
 * to prevent abuse and reduce SMS costs. Uses IP address as fallback
 * when phone number is not provided in the request body.
 */
export const smsRateLimitConfig: RateLimitOptions = {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (request: FastifyRequest) => {
    const { phoneNumber } = request.body as { phoneNumber?: string };
    return phoneNumber || request.ip;
  },
  errorResponseBuilder: (_request, context) => {
    const error = new Error('Too many verification code requests. Please try again later.') as Error & {
      statusCode: number;
      code: string;
      customRateLimitMessage: string;
    };
    error.statusCode = context.statusCode;
    error.code = 'RATE_LIMIT_EXCEEDED';
    // Add custom property to signal custom rate limit message
    error.customRateLimitMessage = 'Too many verification code requests. Please try again later.';
    return error;
  },
};
