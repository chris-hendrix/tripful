import { randomInt } from "crypto";

// Counter for guaranteed uniqueness within same process
let phoneCounter = 0;

/**
 * Generates a unique phone number for testing
 * Uses counter + random digits to ensure uniqueness across parallel test runs
 * @returns A unique phone number in E.164 format starting with +1555
 */
export function generateUniquePhone(): string {
  // Use incrementing counter (3 digits) + random (4 digits) for high uniqueness
  // Counter ensures uniqueness within same process, random adds cross-process uniqueness
  const counter = (++phoneCounter % 1000).toString().padStart(3, "0");
  const random = randomInt(1000, 10000); // 4 random digits
  return `+1555${counter}${random}`;
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
