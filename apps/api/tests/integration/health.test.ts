import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../helpers.js";

describe("Health Check Endpoint", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("should return 200 status code", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return correct response structure", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = JSON.parse(response.body);

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("database");
  });

  it("should return status as ok", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = JSON.parse(response.body);

    expect(body.status).toBe("ok");
  });

  it("should return valid ISO-8601 timestamp", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = JSON.parse(response.body);

    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("should return database status as connected or disconnected", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = JSON.parse(response.body);

    expect(["connected", "disconnected"]).toContain(body.database);
  });

  it("should return database as connected when database is available", async () => {
    app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = JSON.parse(response.body);

    // In test environment with proper setup, database should be connected
    expect(body.database).toBe("connected");
  });
});
