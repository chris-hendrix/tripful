import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { errorHandler } from '@/middleware/error.middleware.js'
import { env } from '@/config/env.js'

/**
 * Build a Fastify app instance for testing
 * Includes all plugins and routes but doesn't start server
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  })

  // Register plugins
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  })

  // Register error handler
  app.setErrorHandler(errorHandler)

  // Phase 1: No routes yet - routes will be added in Task 3.2
  // await app.register(healthRoutes, { prefix: '/api/health' })

  await app.ready()

  return app
}
