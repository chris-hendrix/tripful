// Tests for invitation validation schemas

import { describe, it, expect } from "vitest";
import {
  createInvitationsSchema,
  updateRsvpSchema,
} from "../schemas/index.js";

describe("createInvitationsSchema", () => {
  it("should accept valid phone number arrays", () => {
    const validInputs = [
      { phoneNumbers: ["+14155552671"] },
      { phoneNumbers: ["+14155552671", "+442071234567"] },
      { phoneNumbers: ["+14155552671", "+442071234567", "+61412345678"] },
    ];

    validInputs.forEach((input) => {
      expect(() => createInvitationsSchema.parse(input)).not.toThrow();
    });
  });

  it("should accept various valid E.164 phone numbers", () => {
    const validPhones = [
      "+14155552671", // US
      "+442071234567", // UK
      "+61412345678", // Australia
      "+8613800138000", // China
      "+919876543210", // India
      "+33123456789", // France
      "+81312345678", // Japan
    ];

    const input = { phoneNumbers: validPhones };
    expect(() => createInvitationsSchema.parse(input)).not.toThrow();
  });

  it("should accept at minimum boundary: 1 phone number", () => {
    const input = { phoneNumbers: ["+14155552671"] };
    const parsed = createInvitationsSchema.parse(input);
    expect(parsed.phoneNumbers).toHaveLength(1);
  });

  it("should accept at maximum boundary: 25 phone numbers", () => {
    const phoneNumbers = Array(25)
      .fill(null)
      .map((_, i) => `+1415555${String(i).padStart(4, "0")}`);
    const input = { phoneNumbers };
    const parsed = createInvitationsSchema.parse(input);
    expect(parsed.phoneNumbers).toHaveLength(25);
  });

  it("should reject empty array", () => {
    const input = { phoneNumbers: [] };
    const result = createInvitationsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "At least one phone number is required",
      );
    }
  });

  it("should reject array with more than 25 phone numbers", () => {
    const phoneNumbers = Array(26)
      .fill(null)
      .map((_, i) => `+1415555${String(i).padStart(4, "0")}`);
    const input = { phoneNumbers };
    const result = createInvitationsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Cannot invite more than 25 members at once",
      );
    }
  });

  it("should reject invalid phone numbers", () => {
    const invalidPhones = [
      "4155552671", // Missing +
      "+1", // Too short
      "+123456789012345678", // Too long (more than 15 digits after +)
      "+1abc5552671", // Contains letters
      "+0155552671", // Country code starts with 0
    ];

    invalidPhones.forEach((phone) => {
      const input = { phoneNumbers: [phone] };
      const result = createInvitationsSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("E.164 format");
      }
    });
  });

  it("should reject non-array phoneNumbers", () => {
    const invalidInputs = [
      { phoneNumbers: "+14155552671" }, // String instead of array
      { phoneNumbers: 12345 }, // Number
      { phoneNumbers: null }, // Null
    ];

    invalidInputs.forEach((input) => {
      const result = createInvitationsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  it("should reject missing phoneNumbers field", () => {
    const result = createInvitationsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should provide helpful error messages for invalid phone format", () => {
    const input = { phoneNumbers: ["not-a-phone"] };
    const result = createInvitationsSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Phone number must be in E.164 format",
      );
    }
  });
});

describe("updateRsvpSchema", () => {
  it("should accept all valid statuses", () => {
    const validStatuses: Array<"going" | "not_going" | "maybe"> = [
      "going",
      "not_going",
      "maybe",
    ];

    validStatuses.forEach((status) => {
      expect(() => updateRsvpSchema.parse({ status })).not.toThrow();
    });
  });

  it("should reject 'no_response' as it is not a valid user input", () => {
    const result = updateRsvpSchema.safeParse({ status: "no_response" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid status values", () => {
    const invalidStatuses = ["", "invalid", "GOING", "attending", "yes", "no"];

    invalidStatuses.forEach((status) => {
      const result = updateRsvpSchema.safeParse({ status });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "Status must be one of: going, not_going, maybe",
        );
      }
    });
  });

  it("should reject missing status field", () => {
    const result = updateRsvpSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should provide helpful error messages", () => {
    const result = updateRsvpSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain(
        "Status must be one of: going, not_going, maybe",
      );
    }
  });
});
