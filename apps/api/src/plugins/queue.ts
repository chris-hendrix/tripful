import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PgBoss } from "pg-boss";

/**
 * Queue plugin
 * Decorates the Fastify instance with a pg-boss queue manager.
 * Starts the boss on registration and stops gracefully on close.
 */
export default fp(
  async function queuePlugin(fastify: FastifyInstance) {
    const boss = new PgBoss({
      connectionString: fastify.config.DATABASE_URL,
      max: 3,
    });

    boss.on("error", (error) => fastify.log.error(error, "pg-boss error"));

    await boss.start();

    fastify.decorate("boss", boss);

    fastify.addHook("onClose", async () => {
      await boss.stop({ graceful: true });
    });
  },
  {
    name: "queue",
    dependencies: ["config"],
  },
);
