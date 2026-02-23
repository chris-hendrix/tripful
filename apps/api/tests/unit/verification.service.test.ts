import { describe, it, expect, vi } from "vitest";
import {
  MockVerificationService,
  TwilioVerificationService,
} from "@/services/verification.service.js";

describe("MockVerificationService", () => {
  describe("sendCode", () => {
    it("should log the fixed code when logger is provided", async () => {
      const mockLogger = { info: vi.fn() };
      const service = new MockVerificationService(mockLogger);

      await service.sendCode("+14155552671");

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { phoneNumber: "+14155552671" },
        "Mock verification code: 123456",
      );
    });

    it("should not throw when no logger is provided", async () => {
      const service = new MockVerificationService();
      await expect(service.sendCode("+14155552671")).resolves.toBeUndefined();
    });
  });

  describe("checkCode", () => {
    it("should return true for code 123456", async () => {
      const service = new MockVerificationService();
      expect(await service.checkCode("+14155552671", "123456")).toBe(true);
    });

    it("should return false for any other code", async () => {
      const service = new MockVerificationService();
      expect(await service.checkCode("+14155552671", "000000")).toBe(false);
      expect(await service.checkCode("+14155552671", "654321")).toBe(false);
    });
  });
});

// Hoist mock fns so they're available inside the hoisted vi.mock factory
const { mockCreate, mockCheckCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockCheckCreate: vi.fn(),
}));

// Mock twilio CJS module: default export is a function with a .Twilio constructor property
vi.mock("twilio", () => {
  function TwilioClient() {
    return {
      verify: {
        v2: {
          services: () => ({
            verifications: { create: mockCreate },
            verificationChecks: { create: mockCheckCreate },
          }),
        },
      },
    };
  }
  const mod = Object.assign(TwilioClient, { Twilio: TwilioClient });
  return { default: mod };
});

describe("TwilioVerificationService", () => {
  describe("sendCode", () => {
    it("should call Twilio Verify API with correct params", async () => {
      mockCreate.mockResolvedValueOnce({ sid: "VE123", status: "pending" });

      const service = new TwilioVerificationService({
        accountSid: "AC_test",
        authToken: "auth_test",
        verifyServiceSid: "VA_test",
      });

      await service.sendCode("+14155552671");

      expect(mockCreate).toHaveBeenCalledWith({
        to: "+14155552671",
        channel: "sms",
      });
    });
  });

  describe("checkCode", () => {
    it("should return true when Twilio returns approved", async () => {
      mockCheckCreate.mockResolvedValueOnce({ status: "approved" });

      const service = new TwilioVerificationService({
        accountSid: "AC_test",
        authToken: "auth_test",
        verifyServiceSid: "VA_test",
      });

      const result = await service.checkCode("+14155552671", "123456");
      expect(result).toBe(true);
      expect(mockCheckCreate).toHaveBeenCalledWith({
        to: "+14155552671",
        code: "123456",
      });
    });

    it("should return false when Twilio returns pending", async () => {
      mockCheckCreate.mockResolvedValueOnce({ status: "pending" });

      const service = new TwilioVerificationService({
        accountSid: "AC_test",
        authToken: "auth_test",
        verifyServiceSid: "VA_test",
      });

      const result = await service.checkCode("+14155552671", "000000");
      expect(result).toBe(false);
    });
  });
});
