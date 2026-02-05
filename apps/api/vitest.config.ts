import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // Execution settings
    // All tests use generateUniquePhone() from test-utils.ts for unique test data
    // No cleanup needed - unique phone numbers prevent conflicts between parallel tests
    // Tests run against main database with test data accumulating (cleaned periodically if needed)
    pool: 'threads',
    isolate: false, // Per Vitest 3.2+ best practices
    fileParallelism: true, // Enable parallel execution for faster tests
    maxConcurrency: 4, // Limit concurrency to avoid database overload
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared/types': path.resolve(__dirname, '../../shared/types'),
      '@shared/schemas': path.resolve(__dirname, '../../shared/schemas'),
      '@shared/utils': path.resolve(__dirname, '../../shared/utils'),
    },
  },
});
