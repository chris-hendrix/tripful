import Fastify from "fastify";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";

// Plugins
import configPlugin from "./plugins/config.js";
import databasePlugin from "./plugins/database.js";
import authServicePlugin from "./plugins/auth-service.js";
import permissionsServicePlugin from "./plugins/permissions-service.js";
import tripServicePlugin from "./plugins/trip-service.js";
import uploadServicePlugin from "./plugins/upload-service.js";
import smsServicePlugin from "./plugins/sms-service.js";
import healthServicePlugin from "./plugins/health-service.js";

// Middleware
import { errorHandler } from "./middleware/error.middleware.js";

// Routes
import { healthRoutes } from "./routes/health.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { tripRoutes } from "./routes/trip.routes.js";

// Import types to ensure module augmentations are loaded
import "./types/index.js";

export interface BuildAppOptions {
  /** Fastify server options (logger, etc.) */
  fastify?: FastifyServerOptions;
  /** Rate limit overrides */
  rateLimit?: {
    global?: boolean;
  };
}

/**
 * Build and configure a Fastify application instance
 * Used by both the production server and test helpers
 */
export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(opts.fastify ?? {});

  // Register config plugin (must be first - other plugins depend on it)
  await app.register(configPlugin);

  // Register database plugin
  await app.register(databasePlugin);

  // Register CORS
  await app.register(cors, {
    origin: app.config.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Total-Count"],
    maxAge: 86400, // 24 hours
  });

  // Register cookie plugin (must be before JWT)
  await app.register(cookie);

  // Register JWT plugin
  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
    sign: {
      expiresIn: "7d",
      algorithm: "HS256",
    },
    verify: {
      algorithms: ["HS256"],
    },
    cookie: {
      cookieName: "auth_token",
      signed: false,
    },
  });

  // Register rate limit plugin
  await app.register(rateLimit, {
    global: opts.rateLimit?.global ?? true,
    max: 100,
    timeWindow: "15 minutes",
    cache: 10000,
    allowList: ["127.0.0.1"],
    skipOnError: false,
  });

  // Register multipart plugin (for file uploads)
  await app.register(multipart, {
    limits: {
      fileSize: app.config.MAX_FILE_SIZE,
      files: 1,
    },
  });

  // Register static file serving plugin (for uploaded images)
  await app.register(fastifyStatic, {
    root: resolve(process.cwd(), app.config.UPLOAD_DIR),
    prefix: "/uploads/",
    decorateReply: false,
  });

  // Register service plugins
  await app.register(smsServicePlugin);
  await app.register(healthServicePlugin);
  await app.register(permissionsServicePlugin);
  await app.register(authServicePlugin);
  await app.register(tripServicePlugin);
  await app.register(uploadServicePlugin);

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes, { prefix: "/api/health" });
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(tripRoutes, { prefix: "/api/trips" });

  return app;
}
