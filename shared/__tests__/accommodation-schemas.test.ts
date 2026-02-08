// Tests for accommodation validation schemas

import { describe, it, expect } from "vitest";
import {
  createAccommodationSchema,
  updateAccommodationSchema,
} from "../schemas/index.js";

describe("createAccommodationSchema", () => {
  it("should accept valid accommodation data with all required fields", () => {
    const validAccommodations = [
      {
        name: "Beachfront Hotel",
        checkIn: "2026-07-15",
        checkOut: "2026-07-20",
      },
      {
        name: "Downtown Apartment",
        checkIn: "2026-08-01",
        checkOut: "2026-08-10",
        address: "123 Main St, City, State 12345",
      },
      {
        name: "Mountain Cabin",
        checkIn: "2026-09-05",
        checkOut: "2026-09-12",
        description: "Cozy cabin with lake view",
        address: "456 Forest Road",
      },
    ];

    validAccommodations.forEach((accommodation) => {
      expect(() =>
        createAccommodationSchema.parse(accommodation),
      ).not.toThrow();
    });
  });

  it("should accept accommodation with all optional fields", () => {
    const accommodation = {
      name: "Luxury Resort",
      checkIn: "2026-07-15",
      checkOut: "2026-07-22",
      address: "789 Beach Boulevard, Miami, FL 33139",
      description: "Five-star resort with ocean view and spa facilities",
      links: [
        "https://example.com/resort",
        "https://example.com/booking",
        "https://example.com/amenities",
      ],
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });

  it("should accept accommodation name at boundary lengths", () => {
    const accommodations = [
      { name: "A", checkIn: "2026-07-15", checkOut: "2026-07-16" }, // Minimum (1)
      { name: "a".repeat(255), checkIn: "2026-07-15", checkOut: "2026-07-16" }, // Maximum (255)
    ];

    accommodations.forEach((accommodation) => {
      expect(() =>
        createAccommodationSchema.parse(accommodation),
      ).not.toThrow();
    });
  });

  it("should reject accommodation names that are too short", () => {
    const accommodation = {
      name: "",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("at least 1 character");
    }
  });

  it("should reject accommodation names that are too long", () => {
    const longName = "a".repeat(256);
    const accommodation = {
      name: longName,
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "not exceed 255 characters",
      );
    }
  });

  it("should reject missing required fields", () => {
    const invalidAccommodations = [
      { checkIn: "2026-07-15", checkOut: "2026-07-16" }, // Missing name
      { name: "Hotel", checkOut: "2026-07-16" }, // Missing checkIn
      { name: "Hotel", checkIn: "2026-07-15" }, // Missing checkOut
      {}, // Missing all required fields
    ];

    invalidAccommodations.forEach((accommodation) => {
      const result = createAccommodationSchema.safeParse(accommodation);
      expect(result.success).toBe(false);
    });
  });

  it("should reject invalid date formats for checkIn", () => {
    const invalidDates = [
      "2026-13-01", // Invalid month
      "2026-02-30", // Invalid day
      "26-07-15", // Wrong format
      "2026/07/15", // Wrong separator
      "July 15, 2026", // Wrong format
      "2026-07-15T12:00:00Z", // Datetime instead of date
      "not-a-date", // Invalid format
    ];

    invalidDates.forEach((checkIn) => {
      const accommodation = {
        name: "Hotel",
        checkIn,
        checkOut: "2026-07-16",
      };

      const result = createAccommodationSchema.safeParse(accommodation);
      expect(result.success).toBe(false);
    });
  });

  it("should reject invalid date formats for checkOut", () => {
    const invalidDates = [
      "2026-13-01", // Invalid month
      "26-07-16", // Wrong format
      "not-a-date", // Invalid format
    ];

    invalidDates.forEach((checkOut) => {
      const accommodation = {
        name: "Hotel",
        checkIn: "2026-07-15",
        checkOut,
      };

      const result = createAccommodationSchema.safeParse(accommodation);
      expect(result.success).toBe(false);
    });
  });

  it("should accept valid ISO date strings (YYYY-MM-DD)", () => {
    const validDates = [
      { checkIn: "2026-01-15", checkOut: "2026-01-20" },
      { checkIn: "2026-12-01", checkOut: "2026-12-31" },
      { checkIn: "2026-02-28", checkOut: "2026-03-05" },
      { checkIn: "2024-02-29", checkOut: "2024-03-05" }, // Leap year
    ];

    validDates.forEach(({ checkIn, checkOut }) => {
      const accommodation = {
        name: "Hotel",
        checkIn,
        checkOut,
      };

      expect(() =>
        createAccommodationSchema.parse(accommodation),
      ).not.toThrow();
    });
  });

  it("should reject checkOut before checkIn", () => {
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-20",
      checkOut: "2026-07-15",
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Check-out date must be after check-in date",
      );
      expect(result.error.issues[0]?.path).toContain("checkOut");
    }
  });

  it("should reject checkOut equal to checkIn", () => {
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-15",
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Check-out date must be after check-in date",
      );
    }
  });

  it("should accept checkOut after checkIn", () => {
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-20",
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });

  it("should accept single day difference", () => {
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });

  it("should reject description that exceeds max length", () => {
    const longDescription = "a".repeat(2001);
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
      description: longDescription,
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "not exceed 2000 characters",
      );
    }
  });

  it("should accept description at max length", () => {
    const maxDescription = "a".repeat(2000);
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
      description: maxDescription,
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });

  it("should reject invalid URLs in links array", () => {
    const invalidUrls = [
      ["not-a-url"],
      ["https://valid.com", "invalid-url"],
      ["just text"],
      ["example.com"], // Missing protocol
    ];

    invalidUrls.forEach((links) => {
      const accommodation = {
        name: "Hotel",
        checkIn: "2026-07-15",
        checkOut: "2026-07-16",
        links,
      };

      const result = createAccommodationSchema.safeParse(accommodation);
      expect(result.success).toBe(false);
    });
  });

  it("should accept valid URLs in links array", () => {
    const validUrls = [
      ["https://example.com"],
      ["http://example.com/booking"],
      ["https://example.com", "https://another.com/reviews"],
      ["https://cdn.example.com/brochure.pdf"],
    ];

    validUrls.forEach((links) => {
      const accommodation = {
        name: "Hotel",
        checkIn: "2026-07-15",
        checkOut: "2026-07-16",
        links,
      };

      expect(() =>
        createAccommodationSchema.parse(accommodation),
      ).not.toThrow();
    });
  });

  it("should reject links array exceeding max items", () => {
    const tooManyLinks = Array(11).fill("https://example.com");
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
      links: tooManyLinks,
    };

    const result = createAccommodationSchema.safeParse(accommodation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("not exceed 10 items");
    }
  });

  it("should accept links array at max items", () => {
    const maxLinks = Array(10).fill("https://example.com");
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
      links: maxLinks,
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });

  it("should accept empty links array", () => {
    const accommodation = {
      name: "Hotel",
      checkIn: "2026-07-15",
      checkOut: "2026-07-16",
      links: [],
    };

    expect(() => createAccommodationSchema.parse(accommodation)).not.toThrow();
  });
});

describe("updateAccommodationSchema", () => {
  it("should accept partial updates with any single field", () => {
    const partialUpdates = [
      { name: "Updated Hotel Name" },
      { address: "New Address" },
      { description: "Updated description" },
      { checkIn: "2026-08-01" },
      { checkOut: "2026-08-10" },
      { links: ["https://example.com"] },
    ];

    partialUpdates.forEach((update) => {
      expect(() => updateAccommodationSchema.parse(update)).not.toThrow();
    });
  });

  it("should accept partial updates with multiple fields", () => {
    const update = {
      name: "Updated Hotel",
      address: "New Address",
      checkIn: "2026-08-01",
      checkOut: "2026-08-10",
    };

    expect(() => updateAccommodationSchema.parse(update)).not.toThrow();
  });

  it("should accept empty object (no updates)", () => {
    expect(() => updateAccommodationSchema.parse({})).not.toThrow();
  });

  it("should still validate field constraints when provided", () => {
    const invalidUpdates = [
      { name: "" }, // Too short
      { name: "a".repeat(256) }, // Too long
      { checkIn: "not-a-date" }, // Invalid date format
      { checkOut: "2026/07/16" }, // Invalid date format
      { description: "a".repeat(2001) }, // Too long
      { links: ["not-a-url"] }, // Invalid URL
      { links: Array(11).fill("https://example.com") }, // Too many links
    ];

    invalidUpdates.forEach((update) => {
      const result = updateAccommodationSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  it("should still validate date cross-validation when both dates provided", () => {
    const update = {
      checkIn: "2026-07-20",
      checkOut: "2026-07-15",
    };

    const result = updateAccommodationSchema.safeParse(update);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Check-out date must be after check-in date",
      );
    }
  });

  it("should allow updating checkIn without checkOut", () => {
    const update = {
      checkIn: "2026-08-01",
    };

    expect(() => updateAccommodationSchema.parse(update)).not.toThrow();
  });

  it("should allow updating checkOut without checkIn", () => {
    const update = {
      checkOut: "2026-08-10",
    };

    expect(() => updateAccommodationSchema.parse(update)).not.toThrow();
  });

  it("should reject checkOut equal to checkIn when both provided", () => {
    const update = {
      checkIn: "2026-07-15",
      checkOut: "2026-07-15",
    };

    const result = updateAccommodationSchema.safeParse(update);
    expect(result.success).toBe(false);
  });

  it("should accept valid partial update with cross-validation passing", () => {
    const update = {
      checkIn: "2026-07-15",
      checkOut: "2026-07-20",
    };

    expect(() => updateAccommodationSchema.parse(update)).not.toThrow();
  });
});
