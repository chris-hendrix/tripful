import type { FastifyRequest } from "fastify";

export function auditLog(
  request: FastifyRequest,
  action: string,
  detail?: {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  request.log.info(
    {
      audit: true,
      action,
      userId: request.user?.sub,
      resourceType: detail?.resourceType,
      resourceId: detail?.resourceId,
      ip: request.ip,
      ...detail?.metadata,
    },
    `audit: ${action}`,
  );
}
