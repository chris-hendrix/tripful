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
    // Use threads pool - faster than forks for sequential execution
    pool: 'threads',
    // Run test files sequentially to avoid database conflicts
    // This is necessary because tests share the same test database
    fileParallelism: false,
    // Note: To enable parallel execution, tests would need unique test data
    // (e.g., using unique phone numbers per test via test-utils.ts)
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
