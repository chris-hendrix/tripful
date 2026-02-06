import type { FastifyRequest, FastifyReply } from "fastify";
import { healthService } from "@/services/health.service.js";

export const healthController = {
  async check(_request: FastifyRequest, reply: FastifyReply) {
    const health = await healthService.getStatus();
    return reply.status(200).send(health);
  },
};
