import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { UploadService } from "@/services/upload.service.js";

/**
 * Upload service plugin
 * Creates an UploadService instance and decorates it on the Fastify instance
 */
export default fp(
  async function uploadServicePlugin(fastify: FastifyInstance) {
    const uploadService = new UploadService();
    fastify.decorate("uploadService", uploadService);
  },
  {
    name: "upload-service",
    dependencies: ["config"],
  },
);
