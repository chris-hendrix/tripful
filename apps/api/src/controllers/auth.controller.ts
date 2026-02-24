import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  RequestCodeInput,
  VerifyCodeInput,
  CompleteProfileInput,
} from "@tripful/shared/schemas";
import { validatePhoneNumber } from "@/utils/phone.js";
import { auditLog } from "@/utils/audit.js";
import { InvalidCodeError } from "../errors.js";

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
  async requestCode(
    request: FastifyRequest<{ Body: RequestCodeInput }>,
    reply: FastifyReply,
  ) {
    // Body is validated by Fastify route schema
    const { phoneNumber } = request.body;

    // Validate phone number format and get E.164 format
    const phoneValidation = validatePhoneNumber(phoneNumber);

    if (!phoneValidation.isValid || !phoneValidation.e164) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: phoneValidation.error || "Invalid phone number format",
        },
      });
    }

    const e164PhoneNumber = phoneValidation.e164;

    try {
      const { verificationService } = request.server;

      // Send verification code via verification service
      await verificationService.sendCode(e164PhoneNumber);

      // Return success response
      return reply.status(200).send({
        success: true,
        message: "Verification code sent",
      });
    } catch (error) {
      // Re-throw typed errors for error handler
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      // Log error for debugging
      request.log.error(
        { error, phoneNumber: e164PhoneNumber },
        "Failed to process verification code request",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code",
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
  async verifyCode(
    request: FastifyRequest<{ Body: VerifyCodeInput }>,
    reply: FastifyReply,
  ) {
    // Body is validated by Fastify route schema
    const { phoneNumber, code } = request.body;

    // Validate phone number format and get E.164 format
    const phoneValidation = validatePhoneNumber(phoneNumber);

    if (!phoneValidation.isValid || !phoneValidation.e164) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: phoneValidation.error || "Invalid phone number format",
        },
      });
    }

    const e164PhoneNumber = phoneValidation.e164;

    try {
      const { authService, verificationService } = request.server;

      // Check code via verification service
      const isValid = await verificationService.checkCode(
        e164PhoneNumber,
        code,
      );

      if (!isValid) {
        auditLog(request, "auth.login_failure", {
          metadata: { phoneNumber: e164PhoneNumber },
        });
        throw new InvalidCodeError("Invalid or expired verification code");
      }

      // Get existing user or create new one
      const user = await authService.getOrCreateUser(e164PhoneNumber);

      // Process any pending invitations for this phone number (fault-tolerant: awaited but wrapped in try/catch so failures don't break auth)
      try {
        await request.server.invitationService.processPendingInvitations(
          user.id,
          e164PhoneNumber,
        );
      } catch (err) {
        request.log.error({ err }, "Failed to process pending invitations");
      }

      // Generate JWT token
      const token = authService.generateToken(user);

      // Set httpOnly cookie with token
      reply.setCookie("auth_token", token, {
        httpOnly: true,
        secure:
          request.server.config.NODE_ENV === "production" ||
          request.server.config.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        ...(request.server.config.COOKIE_DOMAIN && {
          domain: request.server.config.COOKIE_DOMAIN,
        }),
      });

      auditLog(request, "auth.login_success", {
        metadata: { userId: user.id },
      });

      // Determine if user needs to complete profile
      const requiresProfile =
        !user.displayName || user.displayName.trim() === "";

      // Return success response
      return reply.status(200).send({
        success: true,
        user,
        requiresProfile,
      });
    } catch (error) {
      // Re-throw typed errors for error handler
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      // Log error for debugging
      request.log.error(
        { error, phoneNumber: e164PhoneNumber },
        "Failed to verify code",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify code",
        },
      });
    }
  },

  /**
   * Complete profile endpoint
   * Updates user's display name and timezone after initial authentication
   * Requires authentication via JWT token
   *
   * @route POST /api/auth/complete-profile
   * @middleware authenticate
   * @param request - Fastify request with displayName and optional timezone in body
   * @param reply - Fastify reply object
   * @returns Success response with updated user
   */
  async completeProfile(
    request: FastifyRequest<{ Body: CompleteProfileInput }>,
    reply: FastifyReply,
  ) {
    // Body is validated by Fastify route schema
    const { displayName, timezone } = request.body;

    try {
      const { authService } = request.server;

      // Get userId from authenticated user (populated by authenticate middleware)
      const userId = request.user.sub;

      // Update profile via service
      const updatedUser = await authService.updateProfile(userId, {
        displayName,
        ...(timezone !== undefined && { timezone }),
      });

      // Generate new JWT token with updated profile info
      const token = authService.generateToken(updatedUser);

      // Set httpOnly cookie with token
      reply.setCookie("auth_token", token, {
        httpOnly: true,
        secure:
          request.server.config.NODE_ENV === "production" ||
          request.server.config.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        ...(request.server.config.COOKIE_DOMAIN && {
          domain: request.server.config.COOKIE_DOMAIN,
        }),
      });

      auditLog(request, "auth.profile_completed");

      // Return success response
      return reply.status(200).send({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      // Re-throw typed errors for error handler
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      // Log error for debugging
      request.log.error(
        { error, userId: request.user.sub },
        "Failed to complete profile",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete profile",
        },
      });
    }
  },

  /**
   * Get current user endpoint
   * Returns the authenticated user's profile information
   * Requires authentication via JWT token
   *
   * @route GET /api/auth/me
   * @middleware authenticate
   * @param request - Fastify request with authenticated user
   * @param reply - Fastify reply object
   * @returns Success response with user data
   */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { authService } = request.server;

      // Get userId from authenticated user (populated by authenticate middleware)
      const userId = request.user.sub;

      // Query database to get full user record
      const result = await authService.getUserById(userId);

      if (!result) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not found",
          },
        });
      }

      // Return success response with user data
      return reply.status(200).send({
        success: true,
        user: result,
      });
    } catch (error) {
      // Re-throw typed errors for error handler
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      // Log error for debugging
      request.log.error(
        { error, userId: request.user.sub },
        "Failed to get current user",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user",
        },
      });
    }
  },

  /**
   * Logout endpoint
   * Clears the authentication token cookie to log out the user
   * Requires authentication via JWT token
   *
   * @route POST /api/auth/logout
   * @middleware authenticate
   * @param request - Fastify request with authenticated user
   * @param reply - Fastify reply object
   * @returns Success response with logout message
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      auditLog(request, "auth.logout");

      // Clear the auth_token cookie
      reply.clearCookie("auth_token", {
        path: "/",
        ...(request.server.config.COOKIE_DOMAIN && {
          domain: request.server.config.COOKIE_DOMAIN,
        }),
      });

      // Return success response
      return reply.status(200).send({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      // Log error for debugging
      request.log.error(
        { error, userId: request.user.sub },
        "Failed to logout",
      );

      // Return generic error response
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to logout",
        },
      });
    }
  },
};
