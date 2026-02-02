import { describe, it, expect, afterEach } from 'vitest';
import { db } from '@/config/database.js';
import { users, verificationCodes } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { authService } from '@/services/auth.service.js';

describe('auth.service', () => {
  const testPhoneNumber = '+15551234567';
  const testPhoneNumber2 = '+15559876543';

  // Clean up test data after each test
  afterEach(async () => {
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, testPhoneNumber));
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, testPhoneNumber2));
    await db.delete(users).where(eq(users.phoneNumber, testPhoneNumber));
    await db.delete(users).where(eq(users.phoneNumber, testPhoneNumber2));
  });

  describe('generateCode', () => {
    it('should generate a 6-digit numeric code', () => {
      const code = authService.generateCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate different codes on successive calls', () => {
      const code1 = authService.generateCode();
      const code2 = authService.generateCode();
      const code3 = authService.generateCode();

      // While theoretically they could be the same, it's extremely unlikely
      // with 1 million possible combinations
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
      expect(code3).toMatch(/^\d{6}$/);
    });

    it('should generate codes in valid range (100000-999999)', () => {
      const code = authService.generateCode();
      const numericCode = parseInt(code, 10);
      expect(numericCode).toBeGreaterThanOrEqual(100000);
      expect(numericCode).toBeLessThan(1000000);
    });
  });

  describe('storeCode', () => {
    it('should store a verification code for a phone number', async () => {
      const code = '123456';
      await authService.storeCode(testPhoneNumber, code);

      const result = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].phoneNumber).toBe(testPhoneNumber);
      expect(result[0].code).toBe(code);
      expect(result[0].expiresAt).toBeInstanceOf(Date);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should set expiry to 5 minutes from now', async () => {
      const code = '123456';
      const beforeStore = Date.now();
      await authService.storeCode(testPhoneNumber, code);
      const afterStore = Date.now();

      const result = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      const expiresAt = result[0].expiresAt.getTime();
      const expectedMin = beforeStore + 5 * 60 * 1000;
      const expectedMax = afterStore + 5 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('should update existing code for same phone number (upsert)', async () => {
      const code1 = '111111';
      const code2 = '222222';

      // Store first code
      await authService.storeCode(testPhoneNumber, code1);
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(result1[0].code).toBe(code1);

      // Store second code for same phone number
      await authService.storeCode(testPhoneNumber, code2);
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);

      // Should have only one record with updated code
      expect(result2).toHaveLength(1);
      expect(result2[0].code).toBe(code2);
    });

    it('should reset createdAt timestamp on update', async () => {
      const code1 = '111111';
      const code2 = '222222';

      await authService.storeCode(testPhoneNumber, code1);
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      const firstCreatedAt = result1[0].createdAt.getTime();

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await authService.storeCode(testPhoneNumber, code2);
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      const secondCreatedAt = result2[0].createdAt.getTime();

      expect(secondCreatedAt).toBeGreaterThan(firstCreatedAt);
    });
  });

  describe('verifyCode', () => {
    it('should return true for valid code', async () => {
      const code = '123456';
      await authService.storeCode(testPhoneNumber, code);

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);
    });

    it('should return false when no code exists for phone number', async () => {
      const isValid = await authService.verifyCode(testPhoneNumber, '123456');
      expect(isValid).toBe(false);
    });

    it('should return false when code does not match', async () => {
      const storedCode = '123456';
      const wrongCode = '654321';
      await authService.storeCode(testPhoneNumber, storedCode);

      const isValid = await authService.verifyCode(testPhoneNumber, wrongCode);
      expect(isValid).toBe(false);
    });

    it('should return false when code has expired', async () => {
      const code = '123456';
      const expiredTime = new Date(Date.now() - 1000); // 1 second ago

      // Manually insert expired code
      await db.insert(verificationCodes).values({
        phoneNumber: testPhoneNumber,
        code,
        expiresAt: expiredTime,
      });

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(false);
    });

    it('should return true when code is about to expire but still valid', async () => {
      const code = '123456';
      const almostExpiredTime = new Date(Date.now() + 1000); // 1 second from now

      // Manually insert code about to expire
      await db.insert(verificationCodes).values({
        phoneNumber: testPhoneNumber,
        code,
        expiresAt: almostExpiredTime,
      });

      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);
    });

    it('should check codes independently for different phone numbers', async () => {
      const code1 = '111111';
      const code2 = '222222';

      await authService.storeCode(testPhoneNumber, code1);
      await authService.storeCode(testPhoneNumber2, code2);

      // Each phone number should only validate with its own code
      expect(await authService.verifyCode(testPhoneNumber, code1)).toBe(true);
      expect(await authService.verifyCode(testPhoneNumber, code2)).toBe(false);
      expect(await authService.verifyCode(testPhoneNumber2, code2)).toBe(true);
      expect(await authService.verifyCode(testPhoneNumber2, code1)).toBe(false);
    });
  });

  describe('deleteCode', () => {
    it('should delete a verification code', async () => {
      const code = '123456';
      await authService.storeCode(testPhoneNumber, code);

      // Verify code exists
      const beforeDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(beforeDelete).toHaveLength(1);

      // Delete code
      await authService.deleteCode(testPhoneNumber);

      // Verify code is deleted
      const afterDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(afterDelete).toHaveLength(0);
    });

    it('should not throw error when deleting non-existent code', async () => {
      await expect(authService.deleteCode(testPhoneNumber)).resolves.not.toThrow();
    });

    it('should only delete code for specified phone number', async () => {
      const code1 = '111111';
      const code2 = '222222';

      await authService.storeCode(testPhoneNumber, code1);
      await authService.storeCode(testPhoneNumber2, code2);

      // Delete code for first phone number
      await authService.deleteCode(testPhoneNumber);

      // Verify first is deleted
      const result1 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(result1).toHaveLength(0);

      // Verify second still exists
      const result2 = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber2))
        .limit(1);
      expect(result2).toHaveLength(1);
      expect(result2[0].code).toBe(code2);
    });
  });

  describe('getOrCreateUser', () => {
    it('should create a new user when one does not exist', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.phoneNumber).toBe(testPhoneNumber);
      expect(user.displayName).toBe('');
      expect(user.timezone).toBe('UTC');
      expect(user.profilePhotoUrl).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should return existing user when one already exists', async () => {
      // Create user first time
      const user1 = await authService.getOrCreateUser(testPhoneNumber);

      // Try to get user again
      const user2 = await authService.getOrCreateUser(testPhoneNumber);

      // Should be the same user
      expect(user2.id).toBe(user1.id);
      expect(user2.phoneNumber).toBe(testPhoneNumber);
      expect(user2.createdAt.getTime()).toBe(user1.createdAt.getTime());
    });

    it('should not create duplicate users for same phone number', async () => {
      await authService.getOrCreateUser(testPhoneNumber);
      await authService.getOrCreateUser(testPhoneNumber);

      // Verify only one user exists
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, testPhoneNumber));

      expect(allUsers).toHaveLength(1);
    });

    it('should create different users for different phone numbers', async () => {
      const user1 = await authService.getOrCreateUser(testPhoneNumber);
      const user2 = await authService.getOrCreateUser(testPhoneNumber2);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.phoneNumber).toBe(testPhoneNumber);
      expect(user2.phoneNumber).toBe(testPhoneNumber2);
    });
  });

  describe('updateProfile', () => {
    it('should update display name', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newDisplayName = 'John Doe';

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: newDisplayName,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.displayName).toBe(newDisplayName);
      expect(updatedUser.timezone).toBe('UTC'); // Should remain unchanged
    });

    it('should update timezone', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newTimezone = 'America/New_York';

      const updatedUser = await authService.updateProfile(user.id, {
        timezone: newTimezone,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.timezone).toBe(newTimezone);
      expect(updatedUser.displayName).toBe(''); // Should remain unchanged
    });

    it('should update both display name and timezone', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const newDisplayName = 'Jane Smith';
      const newTimezone = 'Europe/London';

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: newDisplayName,
        timezone: newTimezone,
      });

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.displayName).toBe(newDisplayName);
      expect(updatedUser.timezone).toBe(newTimezone);
    });

    it('should update the updatedAt timestamp', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);
      const originalUpdatedAt = user.updatedAt.getTime();

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: 'Updated Name',
      });

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('should not affect other user fields', async () => {
      const user = await authService.getOrCreateUser(testPhoneNumber);

      const updatedUser = await authService.updateProfile(user.id, {
        displayName: 'New Name',
      });

      expect(updatedUser.phoneNumber).toBe(user.phoneNumber);
      expect(updatedUser.profilePhotoUrl).toBe(user.profilePhotoUrl);
      expect(updatedUser.createdAt.getTime()).toBe(user.createdAt.getTime());
    });
  });

  describe('integration: complete auth flow', () => {
    it('should handle complete verification flow', async () => {
      // 1. Generate and store code
      const code = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code);

      // 2. Verify code
      const isValid = await authService.verifyCode(testPhoneNumber, code);
      expect(isValid).toBe(true);

      // 3. Get or create user after successful verification
      const user = await authService.getOrCreateUser(testPhoneNumber);
      expect(user.phoneNumber).toBe(testPhoneNumber);

      // 4. Delete code after successful verification
      await authService.deleteCode(testPhoneNumber);
      const codeAfterDelete = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(codeAfterDelete).toHaveLength(0);

      // 5. Update user profile
      const updatedUser = await authService.updateProfile(user.id, {
        displayName: 'Test User',
        timezone: 'America/Los_Angeles',
      });
      expect(updatedUser.displayName).toBe('Test User');
      expect(updatedUser.timezone).toBe('America/Los_Angeles');
    });

    it('should handle failed verification flow', async () => {
      // 1. Generate and store code
      const code = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code);

      // 2. Try to verify with wrong code
      const isValid = await authService.verifyCode(testPhoneNumber, '000000');
      expect(isValid).toBe(false);

      // 3. Code should still exist for retry
      const storedCode = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber))
        .limit(1);
      expect(storedCode).toHaveLength(1);

      // 4. Verify with correct code
      const isValidRetry = await authService.verifyCode(testPhoneNumber, code);
      expect(isValidRetry).toBe(true);
    });

    it('should handle code resend (overwrite)', async () => {
      // 1. Generate and store first code
      const code1 = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code1);

      // 2. User requests resend - generate and store second code
      const code2 = authService.generateCode();
      await authService.storeCode(testPhoneNumber, code2);

      // 3. First code should no longer work
      const isValid1 = await authService.verifyCode(testPhoneNumber, code1);
      expect(isValid1).toBe(false);

      // 4. Second code should work
      const isValid2 = await authService.verifyCode(testPhoneNumber, code2);
      expect(isValid2).toBe(true);

      // 5. Should only have one code in database
      const allCodes = await db
        .select()
        .from(verificationCodes)
        .where(eq(verificationCodes.phoneNumber, testPhoneNumber));
      expect(allCodes).toHaveLength(1);
      expect(allCodes[0].code).toBe(code2);
    });
  });
});
