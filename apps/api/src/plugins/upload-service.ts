import { resolve } from "node:path";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { UploadService } from "@/services/upload.service.js";
import { LocalStorageService } from "@/services/storage.service.js";

/**
 * Upload service plugin
 * Creates a LocalStorageService and UploadService, decorating the Fastify instance
 */
export default fp(
  async function uploadServicePlugin(fastify: FastifyInstance) {
    const uploadsDir = resolve(
      import.meta.dirname,
      "..",
      "..",
      fastify.config.UPLOAD_DIR,
    );
    const storage = new LocalStorageService(uploadsDir);
    const uploadService = new UploadService(storage);
    fastify.decorate("uploadService", uploadService);
  },
  {
    name: "upload-service",
    fastify: "5.x",
    dependencies: ["config"],
  },
);
