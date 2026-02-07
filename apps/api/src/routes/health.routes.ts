import type { FastifyInstance } from "fastify";
import { healthController } from "@/controllers/health.controller.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/", healthController.check);
  fastify.get("/live", healthController.live);
  fastify.get("/ready", healthController.ready);
}
