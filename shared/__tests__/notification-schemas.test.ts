// Tests for notification validation schemas

import { describe, it, expect } from "vitest";
import { notificationPreferencesSchema } from "../schemas/index.js";

describe("notificationPreferencesSchema", () => {
  it("should accept valid preferences with all fields", () => {
    const preferences = {
      dailyItinerary: false,
      tripMessages: true,
    };

    expect(() =>
      notificationPreferencesSchema.parse(preferences),
    ).not.toThrow();
  });

  it("should accept all-false preferences", () => {
    const preferences = {
      dailyItinerary: false,
      tripMessages: false,
    };

    expect(() =>
      notificationPreferencesSchema.parse(preferences),
    ).not.toThrow();
  });

  it("should accept all-true preferences", () => {
    const preferences = {
      dailyItinerary: true,
      tripMessages: true,
    };

    expect(() =>
      notificationPreferencesSchema.parse(preferences),
    ).not.toThrow();
  });

  it("should reject missing fields", () => {
    const invalidPreferences = [
      { tripMessages: true }, // Missing dailyItinerary
      { dailyItinerary: true }, // Missing tripMessages
      {}, // Missing all fields
    ];

    invalidPreferences.forEach((prefs) => {
      const result = notificationPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });
  });

  it("should reject non-boolean values", () => {
    const invalidPreferences = [
      { dailyItinerary: 1, tripMessages: true },
      { dailyItinerary: true, tripMessages: null },
    ];

    invalidPreferences.forEach((prefs) => {
      const result = notificationPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });
  });
});
