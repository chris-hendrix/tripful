import type { FastifyInstance } from "fastify";
import { buildApp } from "@/app.js";

/**
 * Build a Fastify app instance for testing
 * Uses the shared buildApp() factory with test-specific overrides
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({
    fastify: {
      logger: false, // Disable logging in tests
    },
    rateLimit: {
      global: false, // Allow route-specific rate limiting only
    },
    disableUnderPressure: true, // Avoid spurious 503s from event loop delays
  });

  await app.ready();

  return app;
}

// Re-export as buildApp for backward compatibility with existing tests
export { buildTestApp as buildApp };
