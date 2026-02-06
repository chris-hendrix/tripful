// Tests for phone number validation utilities

import { describe, it, expect } from "vitest";
import { validatePhoneNumber } from "@/utils/phone.js";

describe("validatePhoneNumber", () => {
  it("should accept valid US phone numbers", () => {
    const validUSNumbers = ["+14155552671", "+12125551234"];

    validUSNumbers.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
      expect(result.e164).toBeDefined();
      expect(result.e164).toBe(phone);
      expect(result.error).toBeUndefined();
    });
  });

  it("should accept valid international phone numbers", () => {
    const validInternationalNumbers = [
      "+442071838750", // UK
      "+33123456789", // France
      "+861234567890", // China
      "+919876543210", // India
    ];

    validInternationalNumbers.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
      expect(result.e164).toBeDefined();
      expect(result.e164).toBe(phone);
      expect(result.error).toBeUndefined();
    });
  });

  it("should reject phone numbers missing country code", () => {
    const numbersWithoutPlus = ["14155552671", "4155552671", "2125551234"];

    numbersWithoutPlus.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.e164).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBe("Invalid phone number format");
    });
  });

  it("should reject phone numbers that are too short", () => {
    const tooShort = ["+1", "+44", "+123", "+1234567"];

    tooShort.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.e164).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBe("Invalid phone number format");
    });
  });

  it("should reject phone numbers that are too long", () => {
    const tooLong = ["+1234567890123456", "+442071838750123456"];

    tooLong.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.e164).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBe("Invalid phone number format");
    });
  });

  it("should accept phone numbers with common formatting", () => {
    const formattedNumbers = [
      { input: "+1-415-555-2671", expected: "+14155552671" }, // Contains hyphens
      { input: "+1 415 555 2671", expected: "+14155552671" }, // Contains spaces
      { input: "+1(415)555-2671", expected: "+14155552671" }, // Contains parentheses and hyphens
    ];

    formattedNumbers.forEach(({ input, expected }) => {
      const result = validatePhoneNumber(input);
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe(expected);
      expect(result.error).toBeUndefined();
    });
  });

  it("should reject phone numbers with invalid characters", () => {
    const invalidChars = [
      "+1abc4155552671", // Contains letters
      "not-a-phone", // Invalid format
    ];

    invalidChars.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.e164).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error).toBe("Invalid phone number format");
    });
  });

  it("should reject empty string", () => {
    const result = validatePhoneNumber("");
    expect(result.isValid).toBe(false);
    expect(result.e164).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error).toBe("Invalid phone number format");
  });

  it("should return correct structure for valid numbers", () => {
    const result = validatePhoneNumber("+14155552671");

    expect(result).toHaveProperty("isValid");
    expect(result).toHaveProperty("e164");
    expect(result).not.toHaveProperty("error");
    expect(typeof result.isValid).toBe("boolean");
    expect(typeof result.e164).toBe("string");
  });

  it("should return correct structure for invalid numbers", () => {
    const result = validatePhoneNumber("invalid");

    expect(result).toHaveProperty("isValid");
    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("e164");
    expect(typeof result.isValid).toBe("boolean");
    expect(typeof result.error).toBe("string");
  });

  it("should handle various invalid formats consistently", () => {
    const invalidFormats = [
      "+0123456789", // Starts with 0 after +
      "++14155552671", // Double plus
      "+", // Just plus sign
      "+++", // Multiple plus signs
      "+1415555267a", // Letter at end
    ];

    invalidFormats.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid phone number format");
    });
  });
});
