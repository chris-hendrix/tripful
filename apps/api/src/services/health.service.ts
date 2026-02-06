import { testConnection } from "@/config/database.js";
import type { HealthCheckResponse } from "@/types/index.js";

export const healthService = {
  async getStatus(): Promise<HealthCheckResponse> {
    const dbConnected = await testConnection();

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "disconnected",
    };
  },
};
