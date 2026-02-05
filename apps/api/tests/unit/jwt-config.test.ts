import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ensureJWTSecret } from '@/config/jwt.js';

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('JWT Configuration', () => {
  let originalEnv: string | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Save original JWT_SECRET
    originalEnv = process.env.JWT_SECRET;

    // Clear environment variable
    delete process.env.JWT_SECRET;

    // Clear all mocks
    vi.clearAllMocks();

    // Spy on console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }

    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('ensureJWTSecret', () => {
    it('should return existing JWT_SECRET from environment', () => {
      const testSecret = 'existing-secret-from-env-variable';
      process.env.JWT_SECRET = testSecret;

      const result = ensureJWTSecret();

      expect(result).toBe(testSecret);
      expect(existsSync).not.toHaveBeenCalled();
      expect(readFileSync).not.toHaveBeenCalled();
      expect(writeFileSync).not.toHaveBeenCalled();
    });

    it('should read JWT_SECRET from .env.local file if it exists', () => {
      const testSecret = 'secret-from-env-local-file';
      const envLocalContent = `DATABASE_URL=postgres://localhost\nJWT_SECRET=${testSecret}\nFRONTEND_URL=http://localhost:3000`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(envLocalContent);

      const result = ensureJWTSecret();

      expect(result).toBe(testSecret);
      expect(existsSync).toHaveBeenCalledWith(expect.stringContaining('.env.local'));
      expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('.env.local'), 'utf-8');
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(process.env.JWT_SECRET).toBe(testSecret);
    });

    it('should generate new JWT_SECRET if not in env or .env.local', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = ensureJWTSecret();

      expect(result).toBeDefined();
      expect(result.length).toBe(128); // 64 bytes = 128 hex characters
      expect(result).toMatch(/^[0-9a-f]{128}$/); // Only hex characters
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.env.local'),
        expect.stringContaining(`JWT_SECRET=${result}`),
        { flag: 'a' }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Generated JWT secret and saved to .env.local');
      expect(process.env.JWT_SECRET).toBe(result);
    });

    it('should generate new JWT_SECRET if .env.local exists but has no JWT_SECRET', () => {
      const envLocalContent = 'DATABASE_URL=postgres://localhost\nFRONTEND_URL=http://localhost:3000';

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(envLocalContent);

      const result = ensureJWTSecret();

      expect(result).toBeDefined();
      expect(result.length).toBe(128);
      expect(result).toMatch(/^[0-9a-f]{128}$/);
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.env.local'),
        expect.stringContaining(`JWT_SECRET=${result}`),
        { flag: 'a' }
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Generated JWT secret and saved to .env.local');
      expect(process.env.JWT_SECRET).toBe(result);
    });

    it('should append JWT_SECRET to .env.local with proper formatting', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = ensureJWTSecret();

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.env.local'),
        `\nJWT_SECRET=${result}\n`,
        { flag: 'a' }
      );
    });

    it('should generate cryptographically secure random secrets', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      // Generate multiple secrets to ensure they're different
      const secret1 = ensureJWTSecret();
      delete process.env.JWT_SECRET;
      vi.clearAllMocks();
      vi.mocked(existsSync).mockReturnValue(false);

      const secret2 = ensureJWTSecret();

      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBe(128);
      expect(secret2.length).toBe(128);
    });
  });
});
