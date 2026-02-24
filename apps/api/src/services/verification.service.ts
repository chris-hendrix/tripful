import Twilio from "twilio";
import type { Logger } from "@/types/logger.js";

/**
 * Verification Service Interface
 * Defines the contract for sending and checking verification codes.
 * Replaces the old ISMSService + AuthService code generation/storage flow.
 */
export interface IVerificationService {
  /**
   * Sends a verification code to the specified phone number
   * @param phoneNumber - The phone number to send the code to (E.164 format)
   */
  sendCode(phoneNumber: string): Promise<void>;

  /**
   * Checks a verification code for a phone number
   * @param phoneNumber - The phone number to check the code for (E.164 format)
   * @param code - The 6-digit verification code
   * @returns true if the code is valid, false otherwise
   */
  checkCode(phoneNumber: string, code: string): Promise<boolean>;
}

/**
 * Twilio Verify Service Implementation
 * Uses Twilio Verify API to send and check verification codes.
 * No phone number or 10DLC registration required — Twilio manages codes,
 * expiry, rate limits, and fraud protection.
 */
export class TwilioVerificationService implements IVerificationService {
  private client: Twilio.Twilio;
  private verifyServiceSid: string;
  private logger: Logger | undefined;

  constructor(opts: {
    accountSid: string;
    authToken: string;
    verifyServiceSid: string;
    logger?: Logger;
    client?: Twilio.Twilio;
  }) {
    this.client = opts.client ?? new Twilio.Twilio(opts.accountSid, opts.authToken);
    this.verifyServiceSid = opts.verifyServiceSid;
    this.logger = opts.logger;
  }

  async sendCode(phoneNumber: string): Promise<void> {
    await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    this.logger?.info({ phoneNumber }, "Twilio Verify: code sent");
  }

  async checkCode(phoneNumber: string, code: string): Promise<boolean> {
    const check = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    const approved = check.status === "approved";

    this.logger?.info(
      { phoneNumber, status: check.status },
      "Twilio Verify: code checked",
    );

    return approved;
  }
}

/**
 * Mock Verification Service Implementation
 * Uses a fixed code (123456) for development and testing.
 * No database or external service required.
 */
export class MockVerificationService implements IVerificationService {
  private logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  async sendCode(phoneNumber: string): Promise<void> {
    this.logger?.info({ phoneNumber }, "Mock verification code: 123456");
  }

  async checkCode(_phoneNumber: string, code: string): Promise<boolean> {
    return code === "123456";
  }
}
