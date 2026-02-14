import { describe, it, expect, vi } from "vitest";
import { auditLog } from "@/utils/audit.js";
import type { FastifyRequest } from "fastify";

function mockRequest(overrides?: { sub?: string; ip?: string }) {
  return {
    user: { sub: overrides?.sub ?? "user-123" },
    ip: overrides?.ip ?? "127.0.0.1",
    log: { info: vi.fn() },
  } as unknown as FastifyRequest;
}

describe("auditLog", () => {
  it("should call request.log.info with audit: true and action", () => {
    const request = mockRequest();
    auditLog(request, "auth.login_success");

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        action: "auth.login_success",
        userId: "user-123",
        ip: "127.0.0.1",
      }),
      "audit: auth.login_success",
    );
  });

  it("should include resourceType and resourceId when provided", () => {
    const request = mockRequest();
    auditLog(request, "trip.create", {
      resourceType: "trip",
      resourceId: "trip-456",
    });

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        action: "trip.create",
        userId: "user-123",
        resourceType: "trip",
        resourceId: "trip-456",
        ip: "127.0.0.1",
      }),
      "audit: trip.create",
    );
  });

  it("should spread metadata into the log object", () => {
    const request = mockRequest();
    auditLog(request, "member.removed", {
      resourceType: "trip",
      resourceId: "trip-789",
      metadata: { memberId: "member-abc" },
    });

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        action: "member.removed",
        memberId: "member-abc",
      }),
      "audit: member.removed",
    );
  });

  it("should handle missing user (unauthenticated requests)", () => {
    const request = {
      user: undefined,
      ip: "10.0.0.1",
      log: { info: vi.fn() },
    } as unknown as FastifyRequest;

    auditLog(request, "auth.login_failure");

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        action: "auth.login_failure",
        userId: undefined,
        ip: "10.0.0.1",
      }),
      "audit: auth.login_failure",
    );
  });

  it("should handle call with no detail parameter", () => {
    const request = mockRequest();
    auditLog(request, "auth.logout");

    expect(request.log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        action: "auth.logout",
        resourceType: undefined,
        resourceId: undefined,
      }),
      "audit: auth.logout",
    );
  });
});
