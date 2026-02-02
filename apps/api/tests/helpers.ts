import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { errorHandler } from '@/middleware/error.middleware.js';
import { env } from '@/config/env.js';
import { healthRoutes } from '@/routes/health.routes.js';
import { authRoutes } from '@/routes/auth.routes.js';
import rateLimit from '@fastify/rate-limit';

/**
 * Build a Fastify app instance for testing
 * Includes all plugins and routes but doesn't start server
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register plugins
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Register rate limit plugin with global: false for route-specific rate limiting
  await app.register(rateLimit, {
    global: false,
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });

  await app.ready();

  return app;
}
