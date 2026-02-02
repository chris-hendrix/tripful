import type { FastifyRequest, FastifyReply } from 'fastify';
import { requestCodeSchema, verifyCodeSchema } from '../../../../shared/schemas/index.js';
import { validatePhoneNumber } from '@/utils/phone.js';
import { authService, AuthService } from '@/services/auth.service.js';
import { smsService } from '@/services/sms.service.js';

/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */
export const authController = {
  /**
   * Request verification code endpoint
   * Validates phone number, generates code, stores it, and sends SMS
   *
   * @route POST /api/auth/request-code
   * @param request - Fastify request with phoneNumber in body
   * @param reply - Fastify reply object
   * @returns Success response with message
   */
  async requestCode(request: FastifyRequest, reply: FastifyReply) {
    // Validate request body with Zod schema
    const result = requestCodeSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: result.error.issues,
        },
      });
    }

    const { phoneNumber } = result.data;

    // Validate phone number format and get E.164 format
    const phoneValidation = validatePhoneNumber(phoneNumber);

    if (!phoneValidation.isValid || !phoneValidation.e164) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: phoneValidation.error || 'Invalid phone number format',
        },
      });
    }

    const e164PhoneNumber = phoneValidation.e164;

    try {
      // Generate 6-digit verification code
      const code = authService.generateCode();

      // Store code in database with 5-minute expiry
      await authService.storeCode(e164PhoneNumber, code);

      // Send SMS with verification code (logs to console)
      await smsService.sendVerificationCode(e164PhoneNumber, code);

      // Return success response
      return reply.status(200).send({
        success: true,
        message: 'Verification code sent',
      });
    } catch (error) {
      // Log error for debugging
      request.log.error({ error, phoneNumber: e164PhoneNumber }, 'Failed to process verification code request');

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification code',
        },
      });
    }
  },

  /**
   * Verify code endpoint
   * Validates phone number and code, gets or creates user, generates JWT token
   *
   * @route POST /api/auth/verify-code
   * @param request - Fastify request with phoneNumber and code in body
   * @param reply - Fastify reply object
   * @returns Success response with user and requiresProfile flag
   */
  async verifyCode(request: FastifyRequest, reply: FastifyReply) {
    // Validate request body with Zod schema
    const result = verifyCodeSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: result.error.issues,
        },
      });
    }

    const { phoneNumber, code } = result.data;

    // Validate phone number format and get E.164 format
    const phoneValidation = validatePhoneNumber(phoneNumber);

    if (!phoneValidation.isValid || !phoneValidation.e164) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: phoneValidation.error || 'Invalid phone number format',
        },
      });
    }

    const e164PhoneNumber = phoneValidation.e164;

    try {
      // Verify code exists, matches, and hasn't expired
      const isValid = await authService.verifyCode(e164PhoneNumber, code);

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid or expired verification code',
          },
        });
      }

      // Get existing user or create new one
      const user = await authService.getOrCreateUser(e164PhoneNumber);

      // Generate JWT token (need fastify instance for JWT)
      const serviceWithFastify = new AuthService(request.server);
      const token = serviceWithFastify.generateToken(user);

      // Set httpOnly cookie with token
      reply.setCookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

      // Delete verification code after successful verification
      await authService.deleteCode(e164PhoneNumber);

      // Determine if user needs to complete profile
      const requiresProfile = !user.displayName || user.displayName.trim() === '';

      // Return success response
      return reply.status(200).send({
        success: true,
        user,
        requiresProfile,
      });
    } catch (error) {
      // Log error for debugging
      request.log.error({ error, phoneNumber: e164PhoneNumber }, 'Failed to verify code');

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify code',
        },
      });
    }
  },
};
