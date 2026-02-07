import type { Logger } from "@/types/logger.js";

/**
 * SMS Service Interface
 * Defines the contract for sending SMS messages
 */
export interface ISMSService {
  /**
   * Sends a verification code to the specified phone number
   * @param phoneNumber - The phone number to send the code to (E.164 format)
   * @param code - The verification code to send
   * @returns Promise that resolves when the SMS is sent
   */
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
}

/**
 * Mock SMS Service Implementation
 * Logs SMS messages using the provided logger instead of sending actual SMS
 * Used for development and testing environments
 */
export class MockSMSService implements ISMSService {
  private logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Sends a verification code by logging it
   * @param phoneNumber - The phone number to send the code to
   * @param code - The verification code to send
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    if (this.logger) {
      this.logger.info(
        { phoneNumber, code, expiresIn: "5 minutes" },
        "SMS Verification Code",
      );
    }
  }
}
