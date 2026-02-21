import type { Logger } from "@/types/logger.js";

/**
 * SMS Service Interface
 * Defines the contract for sending SMS messages.
 * Callers are responsible for formatting message content.
 */
export interface ISMSService {
  /**
   * Sends an SMS message to the specified phone number
   * @param phoneNumber - The phone number to send the message to (E.164 format)
   * @param message - The message content to send
   * @returns Promise that resolves when the SMS is sent
   */
  sendMessage(phoneNumber: string, message: string): Promise<void>;
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
   * Sends an SMS message by logging it
   * @param phoneNumber - The phone number to send the message to
   * @param message - The message content to send
   */
  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (this.logger) {
      this.logger.info({ phoneNumber, message }, "SMS Message Sent");
    }
  }
}
