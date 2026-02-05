import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { testConnection, closeDatabase } from './config/database.js';
import { errorHandler } from './middleware/error.middleware.js';
import { healthRoutes } from './routes/health.routes.js';

const fastify: FastifyInstance = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  connectionTimeout: 30000,
  keepAliveTimeout: 5000,
  bodyLimit: 1048576, // 1MB
});

// Register CORS plugin
await fastify.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
});

// Register JWT plugin
await fastify.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '7d',
    algorithm: 'HS256',
  },
  verify: {
    algorithms: ['HS256'],
  },
});

// Register rate limit plugin
await fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: ['127.0.0.1'],
  skipOnError: false,
});

// Register error handler
fastify.setErrorHandler(errorHandler);

// Register routes
await fastify.register(healthRoutes, { prefix: '/api/health' });

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'] as const;
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
      fastify.log.error('Failed to connect to database');
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
