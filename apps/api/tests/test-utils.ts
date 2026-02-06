import { randomInt } from "crypto";

// Counter for guaranteed uniqueness within same process
let phoneCounter = 0;

/**
 * Generates a unique phone number for testing
 * Uses timestamp + counter + random to ensure uniqueness across all test runs
 * @returns A unique phone number in E.164 format starting with +1555
 */
export function generateUniquePhone(): string {
  // Use timestamp (last 4 digits) + counter (3 digits) + random (3 digits) for guaranteed uniqueness
  const timestamp = Date.now() % 10000; // Last 4 digits of timestamp
  const counter = (++phoneCounter % 1000).toString().padStart(3, "0");
  const random = randomInt(100, 1000); // 3 random digits
  return `+1555${timestamp}${counter}${random}`;
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
