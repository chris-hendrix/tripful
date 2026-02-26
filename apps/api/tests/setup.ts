import { beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { config } from "dotenv";

// Load test environment variables
// Vitest automatically sets NODE_ENV='test'
config({ path: ".env" });

// Use main database for tests
// Tests use unique phone numbers (generateUniquePhone) to prevent conflicts
// This allows parallel test execution without interference
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

beforeAll(async () => {
  // Test database connection
  try {
    await testPool.query("SELECT 1");
    console.log("✓ Test database connected");
  } catch (error) {
    console.error("✗ Test database connection failed:", error);
    throw error;
  }

  // Clean up rate limit entries from previous test runs to prevent
  // stale PG-backed rate limit state causing unexpected 429 responses
  try {
    await testPool.query("DELETE FROM rate_limit_entries");
  } catch {
    // Table may not exist yet if migrations haven't run
  }

  // Clean up blacklisted tokens from previous test runs
  try {
    await testPool.query("DELETE FROM blacklisted_tokens");
  } catch {
    // Table may not exist yet if migrations haven't run
  }
});

afterAll(async () => {
  // Clean up connections
  await testPool.end();
  console.log("✓ Test database connection closed");
});

// Export for use in tests
export { testPool };
