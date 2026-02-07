import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MemberTravelService } from "@/services/member-travel.service.js";

/**
 * Member travel service plugin
 * Creates a MemberTravelService instance and decorates it on the Fastify instance
 */
export default fp(
  async function memberTravelServicePlugin(fastify: FastifyInstance) {
    const memberTravelService = new MemberTravelService(
      fastify.db,
      fastify.permissionsService,
    );
    fastify.decorate("memberTravelService", memberTravelService);
  },
  {
    name: "member-travel-service",
    dependencies: ["database", "permissions-service"],
  },
);
