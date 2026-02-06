import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
// Ensure JWT secret exists BEFORE loading env (which validates it)
import { ensureJWTSecret } from "./config/jwt.js";
ensureJWTSecret();
import { env } from "./config/env.js";
import { testConnection, closeDatabase } from "./config/database.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { healthRoutes } from "./routes/health.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { tripRoutes } from "./routes/trip.routes.js";

const fastify: FastifyInstance = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
  requestIdHeader: "x-request-id",
  requestIdLogLabel: "reqId",
  connectionTimeout: 30000,
  keepAliveTimeout: 5000,
  bodyLimit: 1048576, // 1MB
});

// Register CORS plugin
await fastify.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400, // 24 hours
});

// Register cookie plugin (must be before JWT)
await fastify.register(cookie);

// Register JWT plugin
await fastify.register(jwt, {
  secret: env.JWT_SECRET,
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
await fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "15 minutes",
  cache: 10000,
  allowList: ["127.0.0.1"],
  skipOnError: false,
});

// Register error handler
fastify.setErrorHandler(errorHandler);

// Register routes
await fastify.register(healthRoutes, { prefix: "/api/health" });
await fastify.register(authRoutes, { prefix: "/api/auth" });
await fastify.register(tripRoutes, { prefix: "/api/trips" });

// Graceful shutdown
const signals = ["SIGINT", "SIGTERM"] as const;
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await closeDatabase();
    await fastify.close();
    process.exit(0);
  });
});

// Start server
async function start() {
  try {
    // Test database connection before starting
    const dbConnected = await testConnection();
    if (!dbConnected) {
      fastify.log.error("Failed to connect to database");
      process.exit(1);
    }

    // Start server
    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    });

    fastify.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
    fastify.log.info(`Environment: ${env.NODE_ENV}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
