import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/config/database.js";
import { trips, members, users, events } from "@/db/schema/index.js";
import { eq } from "drizzle-orm";
import { TripService } from "@/services/trip.service.js";
import { PermissionsService } from "@/services/permissions.service.js";
import { generateUniquePhone } from "../test-utils.js";
import type { CreateTripInput } from "@tripful/shared/schemas";

// Create service instances with db for testing
const permissionsService = new PermissionsService(db);
const tripService = new TripService(db, permissionsService);

describe("trip-theme", () => {
  let testUserId: string;
  let testPhone: string;

  const cleanup = async () => {
    if (testUserId) {
      await db.delete(events).where(eq(events.createdBy, testUserId));
      await db.delete(members).where(eq(members.userId, testUserId));
      await db.delete(trips).where(eq(trips.createdBy, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  };

  beforeEach(async () => {
    testPhone = generateUniquePhone();
    await cleanup();

    const [testUser] = await db
      .insert(users)
      .values({
        phoneNumber: testPhone,
        displayName: "Theme Test User",
        timezone: "UTC",
      })
      .returning();
    testUserId = testUser.id;
  });

  afterEach(cleanup);

  it("should create trip with theme fields", async () => {
    const tripData: CreateTripInput = {
      name: "Themed Trip",
      destination: "Las Vegas",
      timezone: "America/Los_Angeles",
      themeColor: "#e94560",
      themeIcon: "\u{1F3B0}",
      themeFont: "bold-sans",
    };

    const trip = await tripService.createTrip(testUserId, tripData);

    expect(trip.themeColor).toBe("#e94560");
    expect(trip.themeIcon).toBe("\u{1F3B0}");
    expect(trip.themeFont).toBe("bold-sans");
  });

  it("should update theme on existing trip", async () => {
    const tripData: CreateTripInput = {
      name: "Plain Trip",
      destination: "Denver",
      timezone: "America/Denver",
    };

    const trip = await tripService.createTrip(testUserId, tripData);
    expect(trip.themeColor).toBeNull();
    expect(trip.themeIcon).toBeNull();
    expect(trip.themeFont).toBeNull();

    const updated = await tripService.updateTrip(trip.id, testUserId, {
      themeColor: "#3498db",
      themeIcon: "\u{1F3D4}\u{FE0F}",
      themeFont: "elegant-serif",
    });

    expect(updated.themeColor).toBe("#3498db");
    expect(updated.themeIcon).toBe("\u{1F3D4}\u{FE0F}");
    expect(updated.themeFont).toBe("elegant-serif");
  });

  it("should clear theme by setting null", async () => {
    const tripData: CreateTripInput = {
      name: "Themed Trip to Clear",
      destination: "Miami",
      timezone: "America/New_York",
      themeColor: "#e94560",
      themeIcon: "\u{1F334}",
      themeFont: "playful",
    };

    const trip = await tripService.createTrip(testUserId, tripData);
    expect(trip.themeColor).toBe("#e94560");

    const updated = await tripService.updateTrip(trip.id, testUserId, {
      themeColor: null,
      themeIcon: null,
      themeFont: null,
    });

    expect(updated.themeColor).toBeNull();
    expect(updated.themeIcon).toBeNull();
    expect(updated.themeFont).toBeNull();
  });

  it("should return theme fields from getTripById", async () => {
    const tripData: CreateTripInput = {
      name: "Get By ID Theme Trip",
      destination: "Tokyo",
      timezone: "Asia/Tokyo",
      themeColor: "#ff6347",
      themeIcon: "\u{1F5FC}",
      themeFont: "clean",
    };

    const created = await tripService.createTrip(testUserId, tripData);
    const detail = await tripService.getTripById(created.id, testUserId);

    expect(detail).not.toBeNull();
    expect(detail!.themeColor).toBe("#ff6347");
    expect(detail!.themeIcon).toBe("\u{1F5FC}");
    expect(detail!.themeFont).toBe("clean");
  });

  it("should return theme fields in getUserTrips summaries", async () => {
    const tripData: CreateTripInput = {
      name: "Summary Theme Trip",
      destination: "Paris",
      timezone: "Europe/Paris",
      themeColor: "#8e44ad",
      themeIcon: "\u{1F5FC}",
      themeFont: "handwritten",
    };

    await tripService.createTrip(testUserId, tripData);
    const result = await tripService.getUserTrips(testUserId);

    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const summary = result.data.find((t) => t.name === "Summary Theme Trip");
    expect(summary).toBeDefined();
    expect(summary!.themeColor).toBe("#8e44ad");
    expect(summary!.themeIcon).toBe("\u{1F5FC}");
    expect(summary!.themeFont).toBe("handwritten");
  });

  it("should return null theme for trips created without theme", async () => {
    const tripData: CreateTripInput = {
      name: "No Theme Trip",
      destination: "London",
      timezone: "Europe/London",
    };

    const trip = await tripService.createTrip(testUserId, tripData);

    expect(trip.themeColor).toBeNull();
    expect(trip.themeIcon).toBeNull();
    expect(trip.themeFont).toBeNull();
  });
});
