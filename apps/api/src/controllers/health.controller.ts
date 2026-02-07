import type { FastifyRequest, FastifyReply } from "fastify";

export const healthController = {
  async check(request: FastifyRequest, reply: FastifyReply) {
    const health = await request.server.healthService.getStatus();
    return reply.status(200).send(health);
  },

  async live(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ status: "ok" });
  },

  async ready(request: FastifyRequest, reply: FastifyReply) {
    const health = await request.server.healthService.getStatus();
    const isReady = health.database === "connected";
    return reply.status(isReady ? 200 : 503).send({
      status: isReady ? "ok" : "error",
      timestamp: health.timestamp,
      database: health.database,
    });
  },
};
