import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Ensures a JWT secret exists, either from environment variables or .env.local file.
 * If no secret exists, generates a new one and saves it to .env.local
 *
 * @returns The JWT secret string
 */
export function ensureJWTSecret(): string {
  // Check if JWT_SECRET already exists in environment
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  const envLocalPath = resolve(process.cwd(), ".env.local");

  // Check if .env.local exists and contains JWT_SECRET
  if (existsSync(envLocalPath)) {
    const envLocalContent = readFileSync(envLocalPath, "utf-8");
    const match = envLocalContent.match(/^JWT_SECRET=(.+)$/m);

    if (match && match[1]) {
      // Set it in process.env so env validation will pick it up
      process.env.JWT_SECRET = match[1];
      return match[1];
    }
  }

  // Generate new JWT secret (64 bytes = 128 hex characters)
  const secret = randomBytes(64).toString("hex");

  // Append to .env.local
  const content = `\nJWT_SECRET=${secret}\n`;
  writeFileSync(envLocalPath, content, { flag: "a" });

  console.log("✓ Generated JWT secret and saved to .env.local");

  // Set it in process.env
  process.env.JWT_SECRET = secret;

  return secret;
}
