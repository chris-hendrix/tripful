import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { healthController } from "@/controllers/health.controller.js";

const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  database: z.string(),
});

const liveResponseSchema = z.object({
  status: z.string(),
});

const readyResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  database: z.string(),
});

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/", { schema: { response: { 200: healthResponseSchema } } }, healthController.check);
  fastify.get("/live", { schema: { response: { 200: liveResponseSchema } } }, healthController.live);
  fastify.get("/ready", { schema: { response: { 200: readyResponseSchema } } }, healthController.ready);
}
