import { describe, it, expect, vi } from "vitest";
import { MockSMSService } from "@/services/sms.service.js";

describe("sms.service", () => {
  describe("sendVerificationCode", () => {
    const testPhone = "+14155552671";
    const testCode = "123456";

    it("should exist and be callable", async () => {
      const service = new MockSMSService();
      expect(service.sendVerificationCode).toBeDefined();
      expect(typeof service.sendVerificationCode).toBe("function");
      await expect(
        service.sendVerificationCode(testPhone, testCode),
      ).resolves.toBeUndefined();
    });

    it("should not throw when no logger is provided", async () => {
      const service = new MockSMSService();
      await expect(
        service.sendVerificationCode(testPhone, testCode),
      ).resolves.toBeUndefined();
    });

    it("should call logger.info with phone number and code when logger is provided", async () => {
      const mockLogger = {
        info: vi.fn(),
      };

      const service = new MockSMSService(mockLogger);
      await service.sendVerificationCode(testPhone, testCode);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { phoneNumber: testPhone, code: testCode, expiresIn: "5 minutes" },
        "SMS Verification Code",
      );
    });

    it("should include phone number in log output", async () => {
      const mockLogger = {
        info: vi.fn(),
      };

      const service = new MockSMSService(mockLogger);
      await service.sendVerificationCode(testPhone, testCode);

      const logData = mockLogger.info.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(logData.phoneNumber).toBe(testPhone);
    });

    it("should include verification code in log output", async () => {
      const mockLogger = {
        info: vi.fn(),
      };

      const service = new MockSMSService(mockLogger);
      await service.sendVerificationCode(testPhone, testCode);

      const logData = mockLogger.info.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(logData.code).toBe(testCode);
    });

    it("should include expiration info in log output", async () => {
      const mockLogger = {
        info: vi.fn(),
      };

      const service = new MockSMSService(mockLogger);
      await service.sendVerificationCode(testPhone, testCode);

      const logData = mockLogger.info.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(logData.expiresIn).toBe("5 minutes");
    });

    it("should include 'SMS Verification Code' as log message", async () => {
      const mockLogger = {
        info: vi.fn(),
      };

      const service = new MockSMSService(mockLogger);
      await service.sendVerificationCode(testPhone, testCode);

      const logMessage = mockLogger.info.mock.calls[0][1];
      expect(logMessage).toBe("SMS Verification Code");
    });
  });
});
