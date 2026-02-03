import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

/**
 * Global setup for Playwright tests
 * Ensures the test database is created and migrated before running tests
 */
export default async function globalSetup() {
  console.log('🔧 Setting up test database...');

  try {
    // Path to the API package
    const apiPath = resolve(__dirname, '../../../api');

    // Run the test setup script
    const { stdout, stderr } = await execAsync('pnpm test:setup', {
      cwd: apiPath,
      env: { ...process.env },
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Test database ready\n');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}
