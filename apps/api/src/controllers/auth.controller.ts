import type { FastifyRequest, FastifyReply } from 'fastify';
import { requestCodeSchema } from '../../../../shared/schemas/index.js';
import { validatePhoneNumber } from '@/utils/phone.js';
import { authService } from '@/services/auth.service.js';
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
};
