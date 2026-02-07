import type { HealthCheckResponse } from "@/types/index.js";

/**
 * Health Service
 * Checks database connectivity and returns system status
 */
export class HealthService {
  constructor(private testConnection: () => Promise<boolean>) {}

  async getStatus(): Promise<HealthCheckResponse> {
    const dbConnected = await this.testConnection();

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "disconnected",
    };
  }
}
