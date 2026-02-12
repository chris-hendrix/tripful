import { describe, it, expect } from "vitest";
import {
  users,
  verificationCodes,
  members,
  invitations,
  type User,
  type NewUser,
  type VerificationCode,
  type NewVerificationCode,
  type Invitation,
  type NewInvitation,
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

    it("should have timezone as nullable without default", () => {
      const columns = getTableColumns(users);
      expect(columns.timezone.notNull).toBe(false);
      expect(columns.timezone.default).toBeUndefined();
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

  describe("Members Table - isOrganizer column", () => {
    it("should have isOrganizer column", () => {
      const columns = getTableColumns(members);
      expect(columns.isOrganizer).toBeDefined();
      expect(columns.isOrganizer.dataType).toBe("boolean");
      expect(columns.isOrganizer.notNull).toBe(true);
      expect(columns.isOrganizer.default).toBeDefined();
    });
  });

  describe("Invitations Table", () => {
    it("should have correct table name", () => {
      expect(getTableName(invitations)).toBe("invitations");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(invitations);
      expect(columns.id).toBeDefined();
      expect(columns.tripId).toBeDefined();
      expect(columns.inviterId).toBeDefined();
      expect(columns.inviteePhone).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.sentAt).toBeDefined();
      expect(columns.respondedAt).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });

    it("should have correct column types", () => {
      const columns = getTableColumns(invitations);
      expect(columns.id.dataType).toBe("string");
      expect(columns.tripId.dataType).toBe("string");
      expect(columns.inviterId.dataType).toBe("string");
      expect(columns.inviteePhone.dataType).toBe("string");
      expect(columns.status.dataType).toBe("string");
      expect(columns.sentAt.dataType).toBe("date");
      expect(columns.respondedAt.dataType).toBe("date");
    });

    it("should have required constraints", () => {
      const columns = getTableColumns(invitations);
      expect(columns.tripId.notNull).toBe(true);
      expect(columns.inviterId.notNull).toBe(true);
      expect(columns.inviteePhone.notNull).toBe(true);
      expect(columns.status.notNull).toBe(true);
    });

    it("should have type exports", () => {
      const selectType: Invitation = {} as Invitation;
      const insertType: NewInvitation = {} as NewInvitation;

      expect(selectType).toBeDefined();
      expect(insertType).toBeDefined();
    });
  });
});
