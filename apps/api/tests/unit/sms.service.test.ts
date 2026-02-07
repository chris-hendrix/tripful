import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { smsService } from "@/services/sms.service.js";

describe("sms.service", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("sendVerificationCode", () => {
    const testPhone = "+14155552671";
    const testCode = "123456";

    it("should exist and be callable", async () => {
      expect(smsService.sendVerificationCode).toBeDefined();
      expect(typeof smsService.sendVerificationCode).toBe("function");
      await expect(
        smsService.sendVerificationCode(testPhone, testCode),
      ).resolves.toBeUndefined();
    });

    it("should call console.log exactly 6 times", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      expect(consoleLogSpy).toHaveBeenCalledTimes(6);
    });

    it("should output the phone number", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const phoneOutput = calls.find((call) =>
        String(call).includes(testPhone),
      );
      expect(phoneOutput).toBeDefined();
      expect(phoneOutput).toContain("Phone:");
      expect(phoneOutput).toContain(testPhone);
    });

    it("should output the verification code", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const codeOutput = calls.find((call) => String(call).includes(testCode));
      expect(codeOutput).toBeDefined();
      expect(codeOutput).toContain("Code:");
      expect(codeOutput).toContain(testCode);
    });

    it("should output expiration message", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const expiresOutput = calls.find((call) =>
        String(call).includes("Expires: 5 minutes"),
      );
      expect(expiresOutput).toBeDefined();
    });

    it("should output decorative borders", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const borders = calls.filter((call) =>
        String(call).includes("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
      );
      expect(borders.length).toBeGreaterThanOrEqual(2);
    });

    it("should output SMS emoji", async () => {
      await smsService.sendVerificationCode(testPhone, testCode);
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const emojiOutput = calls.find((call) => String(call).includes("📱"));
      expect(emojiOutput).toBeDefined();
      expect(emojiOutput).toContain("SMS Verification Code");
    });
  });
});
