import { beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env' });

// Use main database for tests
// Tests use unique phone numbers (generateUniquePhone) to prevent conflicts
// This allows parallel test execution without interference
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

beforeAll(async () => {
  // Test database connection
  try {
    await testPool.query('SELECT 1');
    console.log('✓ Test database connected');
  } catch (error) {
    console.error('✗ Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up connections
  await testPool.end();
  console.log('✓ Test database connection closed');
});

// Export for use in tests
export { testPool };
