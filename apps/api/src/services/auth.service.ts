import { randomInt } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { users, verificationCodes, type User } from "@/db/schema/index.js";
import type { JWTPayload, AppDatabase } from "@/types/index.js";
import { eq } from "drizzle-orm";
import { AccountLockedError } from "@/errors.js";

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
   * Checks that the code exists, matches, and has not expired.
   * Tracks failed attempts and locks the account after 5 failures (15-min cooldown).
   * @param phoneNumber - The phone number to verify
   * @param code - The code to verify
   * @returns Promise that resolves to true if valid, false otherwise
   * @throws AccountLockedError if too many failed attempts
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
   * Gets a user by their ID
   * @param userId - The UUID of the user to retrieve
   * @returns Promise that resolves to the user record or null if not found
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Updates a user's profile information
   * @param userId - The UUID of the user to update
   * @param data - The profile data to update (displayName and/or timezone)
   * @returns Promise that resolves to the updated user record
   */
  updateProfile(
    userId: string,
    data: {
      displayName?: string;
      timezone?: string | null;
      profilePhotoUrl?: string | null;
      handles?: Record<string, string> | null;
    },
  ): Promise<User>;

  /**
   * Generates a JWT token for a user
   * @param user - The user to generate a token for
   * @returns The signed JWT token string
   */
  generateToken(user: User): string;

  /**
   * Verifies a JWT token and returns the decoded payload
   * @param token - The JWT token string to verify
   * @returns The decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload;
}

/**
 * Authentication Service Implementation
 * Handles verification code generation, storage, and user management
 */
export class AuthService implements IAuthService {
  private fastify: FastifyInstance | undefined;

  constructor(
    private db: AppDatabase,
    fastify?: FastifyInstance,
  ) {
    this.fastify = fastify;
  }
  /**
   * Generates a random 6-digit numeric verification code
   * Uses crypto.randomInt for secure random number generation
   * In non-production environments, returns a fixed code for easier testing
   * @returns A 6-digit string code (e.g., "123456")
   */
  generateCode(): string {
    // Use fixed code when enabled (typically in development and test environments)
    // This makes manual testing and E2E tests easier with a predictable code
    if (this.fastify?.config.ENABLE_FIXED_VERIFICATION_CODE) {
      return "123456";
    }

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

    await this.db
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
          failedAttempts: 0,
          lockedUntil: null,
          createdAt: new Date(), // Reset creation time on update
        },
      });
  }

  /**
   * Verifies a code for a phone number
   * Checks that the code exists, matches, and has not expired.
   * Tracks failed attempts and locks the account after 5 failures (15-min cooldown).
   * @param phoneNumber - The phone number to verify
   * @param code - The code to verify
   * @returns true if the code is valid and not expired, false otherwise
   * @throws AccountLockedError if too many failed attempts
   */
  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);

    const record = result[0];

    if (!record) {
      return false; // No code found for this phone number
    }

    const now = new Date();

    // Check if account is locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMs = record.lockedUntil.getTime() - now.getTime();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      throw new AccountLockedError(
        `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin === 1 ? "" : "s"}.`,
      );
    }

    // If lockout expired, reset failed attempts
    if (record.lockedUntil && record.lockedUntil <= now) {
      await this.db
        .update(verificationCodes)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(verificationCodes.phoneNumber, phoneNumber));
      record.failedAttempts = 0;
      record.lockedUntil = null;
    }

    if (record.code !== code) {
      // Increment failed attempts
      const newAttempts = record.failedAttempts + 1;
      const lockout =
        newAttempts >= 5 ? new Date(now.getTime() + 15 * 60_000) : null;

      await this.db
        .update(verificationCodes)
        .set({
          failedAttempts: newAttempts,
          ...(lockout && { lockedUntil: lockout }),
        })
        .where(eq(verificationCodes.phoneNumber, phoneNumber));

      return false; // Code doesn't match
    }

    if (now > record.expiresAt) {
      return false; // Code has expired
    }

    // Success — reset failed attempts
    if (record.failedAttempts > 0) {
      await this.db
        .update(verificationCodes)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(verificationCodes.phoneNumber, phoneNumber));
    }

    return true; // Code is valid
  }

  /**
   * Deletes a verification code after successful verification
   * @param phoneNumber - The phone number whose code should be deleted
   */
  async deleteCode(phoneNumber: string): Promise<void> {
    await this.db
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
    const existingResult = await this.db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    const existingUser = existingResult[0];

    if (existingUser) {
      return existingUser;
    }

    // Create new user with default values
    const newUserResult = await this.db
      .insert(users)
      .values({
        phoneNumber,
        displayName: "", // Empty string by default
      })
      .returning();

    if (!newUserResult[0]) {
      throw new Error("Failed to create user");
    }

    return newUserResult[0];
  }

  /**
   * Gets a user by their ID
   * @param userId - The UUID of the user to retrieve
   * @returns The user record or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0] || null;
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
    data: {
      displayName?: string;
      timezone?: string | null;
      profilePhotoUrl?: string | null;
      handles?: Record<string, string> | null;
    },
  ): Promise<User> {
    const updateData: Partial<User> = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      throw new Error("User not found");
    }

    return result[0];
  }

  /**
   * Generates a JWT token for a user with 7-day expiry
   * Token payload includes user ID and optional display name
   * @param user - The user to generate a token for
   * @returns The signed JWT token string
   */
  generateToken(user: User): string {
    if (!this.fastify) {
      throw new Error("FastifyInstance not available");
    }

    const payload = {
      sub: user.id,
      ...(user.displayName && { name: user.displayName }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.fastify.jwt.sign(payload as any);
  }

  /**
   * Verifies a JWT token and returns the decoded payload
   * @param token - The JWT token string to verify
   * @returns The decoded JWT payload
   * @throws Error if token is invalid, expired, or malformed
   */
  verifyToken(token: string): JWTPayload {
    if (!this.fastify) {
      throw new Error("FastifyInstance not available");
    }

    try {
      return this.fastify.jwt.verify<JWTPayload>(token);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      throw new Error("Token verification failed");
    }
  }
}
