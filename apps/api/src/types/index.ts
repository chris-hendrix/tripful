// API-specific types

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
