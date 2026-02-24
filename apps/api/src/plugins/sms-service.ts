import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MockSMSService } from "@/services/sms.service.js";

/**
 * SMS service plugin
 * Creates a MockSMSService instance with the Fastify logger
 * and decorates it on the Fastify instance.
 *
 * NOTE: Only MockSMSService exists. A real Twilio SMS implementation
 * should be added before relying on SMS delivery in production.
 */
export default fp(
  async function smsServicePlugin(fastify: FastifyInstance) {
    if (fastify.config.NODE_ENV === "production") {
      fastify.log.warn(
        "MockSMSService is active in production — SMS invitations and notifications will be logged, not sent. " +
          "Add a real SMS service implementation when SMS delivery is needed.",
      );
    }

    const smsService = new MockSMSService(fastify.log);
    fastify.decorate("smsService", smsService);
  },
  {
    name: "sms-service",
    fastify: "5.x",
    dependencies: ["config"],
  },
);
