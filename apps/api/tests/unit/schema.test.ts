import { describe, it, expect } from "vitest";
import {
  users,
  verificationCodes,
  type User,
  type NewUser,
  type VerificationCode,
  type NewVerificationCode,
} from "@/db/schema/index.js";
import { getTableName, getTableColumns } from "drizzle-orm";

describe("Database Schema", () => {
  describe("Users Table", () => {
    it("should have users table defined", () => {
      expect(users).toBeDefined();
      expect(getTableName(users)).toBe("users");
    });

    it("should have correct columns", () => {
      const columns = getTableColumns(users);

      expect(columns.id).toBeDefined();
      expect(columns.phoneNumber).toBeDefined();
      expect(columns.displayName).toBeDefined();
      expect(columns.profilePhotoUrl).toBeDefined();
      expect(columns.timezone).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });

    it("should have phone_number as required field", () => {
      const columns = getTableColumns(users);
      expect(columns.phoneNumber.notNull).toBe(true);
    });

    it("should have timezone with default value UTC", () => {
      const columns = getTableColumns(users);
      expect(columns.timezone.notNull).toBe(true);
      expect(columns.timezone.default).toBeDefined();
    });

    it("should have type exports", () => {
      // Type-level assertions (compile-time checks)
      const selectType: User = {} as User;
      const insertType: NewUser = {} as NewUser;

      expect(selectType).toBeDefined();
      expect(insertType).toBeDefined();
    });
  });

  describe("Verification Codes Table", () => {
    it("should have verification_codes table defined", () => {
      expect(verificationCodes).toBeDefined();
      expect(getTableName(verificationCodes)).toBe("verification_codes");
    });

    it("should have correct columns", () => {
      const columns = getTableColumns(verificationCodes);

      expect(columns.phoneNumber).toBeDefined();
      expect(columns.code).toBeDefined();
      expect(columns.expiresAt).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });

    it("should have phone_number as primary key", () => {
      const columns = getTableColumns(verificationCodes);
      expect(columns.phoneNumber.primary).toBe(true);
    });

    it("should have code and expiresAt as required fields", () => {
      const columns = getTableColumns(verificationCodes);
      expect(columns.code.notNull).toBe(true);
      expect(columns.expiresAt.notNull).toBe(true);
    });

    it("should have type exports", () => {
      // Type-level assertions (compile-time checks)
      const selectType: VerificationCode = {} as VerificationCode;
      const insertType: NewVerificationCode = {} as NewVerificationCode;

      expect(selectType).toBeDefined();
      expect(insertType).toBeDefined();
    });
  });
});
