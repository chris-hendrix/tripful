// API-specific types

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Env } from "@/config/env.js";
import type { IAuthService } from "@/services/auth.service.js";
import type { ITripService } from "@/services/trip.service.js";
import type { IPermissionsService } from "@/services/permissions.service.js";
import type { IUploadService } from "@/services/upload.service.js";
import type { ISMSService } from "@/services/sms.service.js";

export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  database: "connected" | "disconnected";
  environment?: string;
}

// JWT Payload types
export interface JWTPayload {
  sub: string; // User ID
  phone: string; // Phone number
  name?: string; // Display name (optional)
  iat: number; // Issued at
  exp: number; // Expires at
}

// Module augmentation for @fastify/jwt
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

// Module augmentation for Fastify instance decorators
declare module "fastify" {
  interface FastifyInstance {
    config: Env;
    db: NodePgDatabase;
    authService: IAuthService;
    tripService: ITripService;
    permissionsService: IPermissionsService;
    uploadService: IUploadService;
    smsService: ISMSService;
    healthService: { getStatus(): Promise<HealthCheckResponse> };
  }
}
