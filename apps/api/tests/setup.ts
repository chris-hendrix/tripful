import { beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env' })

// Phase 1: Use main database for tests (no schema yet, so safe)
// Phase 2+: Will need separate test database for schema isolation
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

beforeAll(async () => {
  // Test database connection
  try {
    await testPool.query('SELECT 1')
    console.log('✓ Test database connected')
  } catch (error) {
    console.error('✗ Test database connection failed:', error)
    throw error
  }
})

afterAll(async () => {
  // Clean up connections
  await testPool.end()
  console.log('✓ Test database connection closed')
})

// Export for use in tests
export { testPool }
