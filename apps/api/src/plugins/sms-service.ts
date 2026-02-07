import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MockSMSService } from "@/services/sms.service.js";

/**
 * SMS service plugin
 * Creates a MockSMSService instance with the Fastify logger
 * and decorates it on the Fastify instance
 */
export default fp(
  async function smsServicePlugin(fastify: FastifyInstance) {
    const smsService = new MockSMSService(fastify.log);
    fastify.decorate("smsService", smsService);
  },
  {
    name: "sms-service",
  },
);
