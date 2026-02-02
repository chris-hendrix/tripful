import { randomInt } from 'node:crypto';
import { db } from '@/config/database.js';
import { users, verificationCodes, type User } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';

/**
 * Authentication Service Interface
 * Defines the contract for authentication and user management operations
 */
export interface IAuthService {
  /**
   * Generates a random 6-digit numeric verification code
   * @returns A 6-digit string code
   */
  generateCode(): string;

  /**
   * Stores a verification code for a phone number with 5-minute expiry
   * Creates a new code or updates existing one (upsert)
   * @param phoneNumber - The phone number to associate the code with (E.164 format)
   * @param code - The 6-digit verification code
   * @returns Promise that resolves when the code is stored
   */
  storeCode(phoneNumber: string, code: string): Promise<void>;

  /**
   * Verifies a code for a phone number
   * Checks that the code exists, matches, and has not expired
   * @param phoneNumber - The phone number to verify
   * @param code - The code to verify
   * @returns Promise that resolves to true if valid, false otherwise
   */
  verifyCode(phoneNumber: string, code: string): Promise<boolean>;

  /**
   * Deletes a verification code after successful verification
   * @param phoneNumber - The phone number whose code should be deleted
   * @returns Promise that resolves when the code is deleted
   */
  deleteCode(phoneNumber: string): Promise<void>;

  /**
   * Gets an existing user by phone number or creates a new one
   * @param phoneNumber - The phone number to look up or create (E.164 format)
   * @returns Promise that resolves to the user record
   */
  getOrCreateUser(phoneNumber: string): Promise<User>;

  /**
   * Updates a user's profile information
   * @param userId - The UUID of the user to update
   * @param data - The profile data to update (displayName and/or timezone)
   * @returns Promise that resolves to the updated user record
   */
  updateProfile(userId: string, data: { displayName?: string; timezone?: string }): Promise<User>;
}

/**
 * Authentication Service Implementation
 * Handles verification code generation, storage, and user management
 */
export class AuthService implements IAuthService {
  /**
   * Generates a random 6-digit numeric verification code
   * Uses crypto.randomInt for secure random number generation
   * @returns A 6-digit string code (e.g., "123456")
   */
  generateCode(): string {
    // Generate random number between 100000 and 999999 (inclusive)
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Stores a verification code for a phone number with 5-minute expiry
   * Uses upsert to either create new code or update existing one
   * @param phoneNumber - The phone number to associate the code with
   * @param code - The 6-digit verification code
   */
  async storeCode(phoneNumber: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    await db
      .insert(verificationCodes)
      .values({
        phoneNumber,
        code,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: verificationCodes.phoneNumber,
        set: {
          code,
          expiresAt,
          createdAt: new Date(), // Reset creation time on update
        },
      });
  }

  /**
   * Verifies a code for a phone number
   * Checks that the code exists, matches, and has not expired
   * @param phoneNumber - The phone number to verify
   * @param code - The code to verify
   * @returns true if the code is valid and not expired, false otherwise
   */
  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const result = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);

    const record = result[0];

    if (!record) {
      return false; // No code found for this phone number
    }

    if (record.code !== code) {
      return false; // Code doesn't match
    }

    if (new Date() > record.expiresAt) {
      return false; // Code has expired
    }

    return true; // Code is valid
  }

  /**
   * Deletes a verification code after successful verification
   * @param phoneNumber - The phone number whose code should be deleted
   */
  async deleteCode(phoneNumber: string): Promise<void> {
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber));
  }

  /**
   * Gets an existing user by phone number or creates a new one
   * If user exists, returns existing record
   * If user doesn't exist, creates new user with default values
   * @param phoneNumber - The phone number to look up or create
   * @returns The user record (existing or newly created)
   */
  async getOrCreateUser(phoneNumber: string): Promise<User> {
    // Try to find existing user
    const existingResult = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    const existingUser = existingResult[0];

    if (existingUser) {
      return existingUser;
    }

    // Create new user with default values
    const newUserResult = await db
      .insert(users)
      .values({
        phoneNumber,
        displayName: '', // Empty string by default
        timezone: 'UTC', // UTC by default
      })
      .returning();

    if (!newUserResult[0]) {
      throw new Error('Failed to create user');
    }

    return newUserResult[0];
  }

  /**
   * Updates a user's profile information
   * Updates displayName and/or timezone, and sets updatedAt timestamp
   * @param userId - The UUID of the user to update
   * @param data - The profile data to update
   * @returns The updated user record
   * @throws Error if user not found (from database constraint)
   */
  async updateProfile(
    userId: string,
    data: { displayName?: string; timezone?: string }
  ): Promise<User> {
    const updateData: Partial<User> = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      throw new Error('User not found');
    }

    return result[0];
  }
}

/**
 * Singleton instance of the authentication service
 * Use this instance throughout the application
 */
export const authService = new AuthService();
