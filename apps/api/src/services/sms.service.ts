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
 * Logs SMS messages to console instead of sending actual SMS
 * Used for development and testing environments
 */
export class MockSMSService implements ISMSService {
  /**
   * Sends a verification code by logging to console
   * @param phoneNumber - The phone number to send the code to
   * @param code - The verification code to send
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 SMS Verification Code');
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Code: ${code}`);
    console.log('Expires: 5 minutes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

/**
 * Singleton instance of the SMS service
 * Use this instance throughout the application
 */
export const smsService = new MockSMSService();
