import { describe, it, expect, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import FormData from "form-data";
import { buildApp } from "../helpers.js";
import { db } from "@/config/database.js";
import { users } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { generateUniquePhone } from "../test-utils.js";

describe("PUT /api/users/me", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should return 200 and update displayName", async () => {
      app = await buildApp();

      // Create test user with complete profile
      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Old Name",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      // Generate JWT token
      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          displayName: "New Name",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("user");
      expect(body.user.displayName).toBe("New Name");
    });

    it("should return 200 and update timezone", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          timezone: "America/New_York",
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.timezone).toBe("America/New_York");
    });

    it("should return 200 and set timezone to null (auto-detect)", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "America/Chicago",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          timezone: null,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.timezone).toBeNull();
    });

    it("should return 200 and update handles with venmo/instagram", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          handles: {
            venmo: "@testuser",
            instagram: "testuser123",
          },
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.handles).toEqual({
        venmo: "@testuser",
        instagram: "testuser123",
      });
    });

    it("should return 200 and clear handles (set to null)", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
          handles: { venmo: "@oldhandle" },
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          handles: null,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.handles).toBeNull();
    });
  });

  describe("Validation Errors", () => {
    it("should return 400 when displayName is too short (< 3 chars)", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          displayName: "AB",
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when invalid handle platform is provided", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          handles: {
            twitter: "@testuser",
          },
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Unauthorized Cases", () => {
    it("should return 401 when no token is provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        payload: {
          displayName: "Test User",
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("JWT Refresh", () => {
    it("should re-set auth_token cookie when displayName changes", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Old Name",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          displayName: "New Name",
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify cookie is set with new token
      const cookies = response.cookies;
      const authCookie = cookies.find((c) => c.name === "auth_token");
      expect(authCookie).toBeDefined();
      expect(authCookie!.value).toBeTruthy();

      // Verify new token includes updated displayName
      const decoded = app.jwt.verify(authCookie!.value);
      expect(decoded).toHaveProperty("sub", testUser.id);
      expect(decoded).toHaveProperty("name", "New Name");
    });

    it("should not re-set auth_token cookie when only timezone changes", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          timezone: "America/Los_Angeles",
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify no auth_token cookie is set when displayName is not changed
      const cookies = response.cookies;
      const authCookie = cookies.find((c) => c.name === "auth_token");
      expect(authCookie).toBeUndefined();
    });
  });

  describe("Database Verification", () => {
    it("should persist fields in database and update updatedAt", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Original Name",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "PUT",
        url: "/api/users/me",
        cookies: {
          auth_token: token,
        },
        payload: {
          displayName: "Updated Name",
          timezone: "Asia/Tokyo",
          handles: { venmo: "@updated" },
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify user was updated in database
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, testUser.id))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe("Updated Name");
      expect(result[0].timezone).toBe("Asia/Tokyo");
      expect(result[0].handles).toEqual({ venmo: "@updated" });
      expect(result[0].updatedAt.getTime()).toBeGreaterThan(
        result[0].createdAt.getTime(),
      );
    });
  });
});

describe("POST /api/users/me/photo", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should upload profile photo and return 200 with updated user", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Create a fake image buffer (1x1 pixel PNG)
      const imageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      // Create form data
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "test.png",
        contentType: "image/png",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("user");
      expect(body.user.profilePhotoUrl).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
    });

    it("should replace existing photo and return new URL", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
          profilePhotoUrl: "/uploads/old-photo.jpg",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Create a fake image buffer (1x1 pixel PNG)
      const imageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      // Create form data
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "new-photo.png",
        contentType: "image/png",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body.user.profilePhotoUrl).not.toBe("/uploads/old-photo.jpg");
      expect(body.user.profilePhotoUrl).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
    });
  });

  describe("Error Cases", () => {
    it("should return 400 when no file is uploaded", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when file type is invalid", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      // Create a fake text file
      const textBuffer = Buffer.from("this is not an image");

      const form = new FormData();
      form.append("file", textBuffer, {
        filename: "document.txt",
        contentType: "text/plain",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
        payload: form,
        headers: form.getHeaders(),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe("Unauthorized Cases", () => {
    it("should return 401 when no token is provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me/photo",
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("DELETE /api/users/me/photo", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("Success Cases", () => {
    it("should remove existing profile photo and return 200", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
          profilePhotoUrl: "/uploads/test-photo.jpg",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("user");
      expect(body.user.profilePhotoUrl).toBeNull();
    });

    it("should return 200 when user has no photo (idempotent)", async () => {
      app = await buildApp();

      const testUserResult = await db
        .insert(users)
        .values({
          phoneNumber: generateUniquePhone(),
          displayName: "Test User",
          timezone: "UTC",
        })
        .returning();

      const testUser = testUserResult[0];

      const token = app.jwt.sign({
        sub: testUser.id,
        name: testUser.displayName,
      });

      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/me/photo",
        cookies: {
          auth_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty("success", true);
      expect(body.user.profilePhotoUrl).toBeNull();
    });
  });

  describe("Unauthorized Cases", () => {
    it("should return 401 when no token is provided", async () => {
      app = await buildApp();

      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/me/photo",
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
