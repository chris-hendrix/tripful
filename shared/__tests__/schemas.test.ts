// Tests for shared validation schemas

import { describe, it, expect } from "vitest";
import {
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
} from "../schemas/index.js";

describe("phoneNumberSchema", () => {
  it("should accept valid E.164 phone numbers", () => {
    const validNumbers = [
      "+14155552671", // US number
      "+442071838750", // UK number
      "+33123456789", // France number
      "+12125551234", // US number
      "+861234567890", // China number
      "+919876543210", // India number
    ];

    validNumbers.forEach((number) => {
      expect(() => phoneNumberSchema.parse(number)).not.toThrow();
    });
  });

  it("should reject invalid phone numbers", () => {
    const invalidNumbers = [
      "4155552671", // Missing '+'
      "+1", // Too short
      "+1234567890123456", // Too long (>15 digits after +)
      "+0123456789", // Starts with 0 after +
      "14155552671", // Missing '+'
      "+1-415-555-2671", // Contains hyphens
      "+1 415 555 2671", // Contains spaces
      "not-a-phone", // Invalid format
      "", // Empty string
    ];

    invalidNumbers.forEach((number) => {
      const result = phoneNumberSchema.safeParse(number);
      expect(result.success).toBe(false);
    });
  });

  it("should provide helpful error messages", () => {
    const result = phoneNumberSchema.safeParse("invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("E.164 format");
    }
  });
});

describe("emailSchema", () => {
  it("should accept valid email addresses", () => {
    const validEmails = [
      "user@example.com",
      "test.user@example.com",
      "user+tag@example.co.uk",
      "user_name@example-domain.com",
      "user123@test.org",
    ];

    validEmails.forEach((email) => {
      expect(() => emailSchema.parse(email)).not.toThrow();
    });
  });

  it("should reject invalid email addresses", () => {
    const invalidEmails = [
      "notanemail", // Missing @
      "@example.com", // Missing local part
      "user@", // Missing domain
      "user @example.com", // Space in local part
      "user@example", // Missing TLD
      "", // Empty string
      "user@.com", // Invalid domain
    ];

    invalidEmails.forEach((email) => {
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
    });
  });

  it("should provide helpful error messages", () => {
    const result = emailSchema.safeParse("invalid-email");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Invalid email");
    }
  });
});

describe("uuidSchema", () => {
  it("should accept valid UUIDs", () => {
    const validUuids = [
      "550e8400-e29b-41d4-a716-446655440000",
      "c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "00000000-0000-0000-0000-000000000000",
    ];

    validUuids.forEach((uuid) => {
      expect(() => uuidSchema.parse(uuid)).not.toThrow();
    });
  });

  it("should reject invalid UUIDs", () => {
    const invalidUuids = [
      "550e8400-e29b-41d4-a716", // Too short
      "550e8400-e29b-41d4-a716-446655440000-extra", // Too long
      "550e8400e29b41d4a716446655440000", // Missing hyphens
      "not-a-uuid-at-all",
      "", // Empty string
      "550e8400-e29b-41d4-a716-44665544000g", // Invalid character 'g'
    ];

    invalidUuids.forEach((uuid) => {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(false);
    });
  });

  it("should provide helpful error messages", () => {
    const result = uuidSchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Invalid UUID");
    }
  });
});
