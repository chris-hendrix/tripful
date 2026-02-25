import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  MockVerificationService,
  TwilioVerificationService,
} from "@/services/verification.service.js";

/**
 * Verification service plugin
 * Creates the appropriate IVerificationService implementation based on config:
 * - ENABLE_FIXED_VERIFICATION_CODE=true → MockVerificationService (dev/test)
 * - Otherwise → TwilioVerificationService (production)
 */
export default fp(
  async function verificationServicePlugin(fastify: FastifyInstance) {
    // Defense in depth: never allow mock verification in production
    if (
      fastify.config.NODE_ENV === "production" &&
      fastify.config.ENABLE_FIXED_VERIFICATION_CODE
    ) {
      throw new Error(
        "FATAL: MockVerificationService cannot be used in production",
      );
    }

    if (fastify.config.ENABLE_FIXED_VERIFICATION_CODE) {
      const service = new MockVerificationService(fastify.log);
      fastify.decorate("verificationService", service);
      fastify.log.warn("Using MockVerificationService (fixed code: 123456)");
    } else {
      const {
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_VERIFY_SERVICE_SID,
      } = fastify.config;

      if (
        !TWILIO_ACCOUNT_SID ||
        !TWILIO_AUTH_TOKEN ||
        !TWILIO_VERIFY_SERVICE_SID
      ) {
        throw new Error(
          "Twilio env vars required when ENABLE_FIXED_VERIFICATION_CODE is false: " +
            "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID",
        );
      }

      const service = new TwilioVerificationService({
        accountSid: TWILIO_ACCOUNT_SID,
        authToken: TWILIO_AUTH_TOKEN,
        verifyServiceSid: TWILIO_VERIFY_SERVICE_SID,
        logger: fastify.log,
      });
      fastify.decorate("verificationService", service);
      fastify.log.info("Using TwilioVerificationService");
    }
  },
  {
    name: "verification-service",
    fastify: "5.x",
    dependencies: ["config"],
  },
);
