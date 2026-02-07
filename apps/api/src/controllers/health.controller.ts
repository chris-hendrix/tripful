import type { FastifyRequest, FastifyReply } from "fastify";

export const healthController = {
  async check(request: FastifyRequest, reply: FastifyReply) {
    const health = await request.server.healthService.getStatus();
    return reply.status(200).send(health);
  },
};
