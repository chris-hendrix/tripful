import { randomInt, randomUUID } from "crypto";

/**
 * Generates a unique phone number for testing
 * Uses UUID-derived digits for guaranteed uniqueness across parallel workers and test files
 * @returns A unique phone number in E.164 format starting with +1555
 */
export function generateUniquePhone(): string {
  // Extract 10 hex digits from a UUID and convert to decimal digits
  const hex = randomUUID().replace(/-/g, "").slice(0, 10);
  const digits = BigInt("0x" + hex) % 10000000000n;
  return `+1555${digits.toString().padStart(10, "0")}`;
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
