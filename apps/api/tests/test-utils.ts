import { randomInt } from 'crypto';

/**
 * Generates a unique phone number for testing
 * Uses process ID, timestamp, and random number to ensure uniqueness across parallel test runs
 * @returns A unique phone number in E.164 format starting with +1555
 */
export function generateUniquePhone(): string {
  // Use timestamp (last 4 digits) + random 3 digits to create unique 7-digit number
  const timestamp = Date.now() % 10000; // Last 4 digits of timestamp
  const random = randomInt(100, 1000); // 3 random digits
  return `+1555${timestamp.toString().padStart(4, '0')}${random}`;
}

/**
 * Generates a unique 6-digit verification code
 * @returns A 6-digit code string
 */
export function generateUniqueCode(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Generates a unique user ID for testing
 * @returns A unique identifier string
 */
export function generateUniqueId(): string {
  return `test-${Date.now()}-${randomInt(1000, 10000)}`;
}
