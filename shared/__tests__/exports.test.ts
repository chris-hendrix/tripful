// Integration test to verify all exports are accessible

import { describe, it, expect } from "vitest";
import {
  // Types
  type User,
  type AuthResponse,
  // Schema inferred types
  type RequestCodeInput,
  type VerifyCodeInput,
  type CompleteProfileInput,
  type CreateTripInput,
  type UpdateTripInput,
  type AddCoOrganizerInput,
  // Schemas
  requestCodeSchema,
  verifyCodeSchema,
  completeProfileSchema,
  createTripSchema,
  updateTripSchema,
  addCoOrganizerSchema,
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
  // Utils
  convertToUTC,
  formatInTimeZone,
} from "../index.js";

describe("Package Exports", () => {
  it("should export all auth schemas", () => {
    expect(requestCodeSchema).toBeDefined();
    expect(verifyCodeSchema).toBeDefined();
    expect(completeProfileSchema).toBeDefined();
  });

  it("should export all trip schemas", () => {
    expect(createTripSchema).toBeDefined();
    expect(updateTripSchema).toBeDefined();
    expect(addCoOrganizerSchema).toBeDefined();
  });

  it("should export existing schemas", () => {
    expect(phoneNumberSchema).toBeDefined();
    expect(emailSchema).toBeDefined();
    expect(uuidSchema).toBeDefined();
  });

  it("should export utils", () => {
    expect(convertToUTC).toBeDefined();
    expect(formatInTimeZone).toBeDefined();
  });

  it("should allow type usage", () => {
    // This test verifies types can be used (compile-time check)
    const user: User = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      phoneNumber: "+14155552671",
      displayName: "Test User",
      timezone: "America/New_York",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(user).toBeDefined();

    const authResponse: AuthResponse = {
      token: "jwt-token",
      user,
      requiresProfile: false,
    };
    expect(authResponse).toBeDefined();

    const requestInput: RequestCodeInput = {
      phoneNumber: "+14155552671",
    };
    expect(requestInput).toBeDefined();

    const verifyInput: VerifyCodeInput = {
      phoneNumber: "+14155552671",
      code: "123456",
    };
    expect(verifyInput).toBeDefined();

    const profileInput: CompleteProfileInput = {
      displayName: "Test User",
      timezone: "America/New_York",
    };
    expect(profileInput).toBeDefined();

    const createTripInput: CreateTripInput = {
      name: "Summer Vacation",
      destination: "Hawaii",
      timezone: "Pacific/Honolulu",
      allowMembersToAddEvents: true,
    };
    expect(createTripInput).toBeDefined();

    const updateTripInput: UpdateTripInput = {
      name: "Updated Trip Name",
    };
    expect(updateTripInput).toBeDefined();

    const addCoOrganizerInput: AddCoOrganizerInput = {
      phoneNumber: "+14155552671",
    };
    expect(addCoOrganizerInput).toBeDefined();
  });

  it("should validate schemas with inferred types", () => {
    const requestInput: RequestCodeInput = {
      phoneNumber: "+14155552671",
    };
    const validated = requestCodeSchema.parse(requestInput);
    expect(validated.phoneNumber).toBe("+14155552671");

    const verifyInput: VerifyCodeInput = {
      phoneNumber: "+14155552671",
      code: "123456",
    };
    const validatedVerify = verifyCodeSchema.parse(verifyInput);
    expect(validatedVerify.code).toBe("123456");

    const profileInput: CompleteProfileInput = {
      displayName: "Test User",
    };
    const validatedProfile = completeProfileSchema.parse(profileInput);
    expect(validatedProfile.displayName).toBe("Test User");
  });
});
