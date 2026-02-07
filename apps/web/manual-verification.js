/**
 * Manual verification script using Playwright
 * This script performs visual verification checks as specified in VERIFICATION.md
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.join(__dirname, '../../.ralph/screenshots');
const baseUrl = 'http://localhost:3000';

async function runManualChecks() {
  console.log('Starting manual verification checks...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1080 }
  });
  const page = await context.newPage();

  const results = [];

  try {
    // Test 1: Check if homepage loads
    console.log('Test 1: Checking homepage...');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(screenshotDir, 'homepage.png'),
      fullPage: true
    });
    results.push({ test: 'Homepage loads', status: 'PASS' });

    // Test 2: Check login page
    console.log('Test 2: Checking login page...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(screenshotDir, 'login-page.png'),
      fullPage: true
    });

    // Check if phone input exists
    const phoneInput = await page.locator('input[type="tel"]').count();
    if (phoneInput > 0) {
      results.push({ test: 'Login page renders', status: 'PASS' });
    } else {
      results.push({ test: 'Login page renders', status: 'FAIL', reason: 'Phone input not found' });
    }

    // Test 3: Check mobile viewport
    console.log('Test 3: Checking mobile viewport...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(screenshotDir, 'homepage-mobile.png'),
      fullPage: true
    });
    results.push({ test: 'Mobile viewport renders', status: 'PASS' });

    // Test 4: Check tablet viewport
    console.log('Test 4: Checking tablet viewport...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(screenshotDir, 'homepage-tablet.png'),
      fullPage: true
    });
    results.push({ test: 'Tablet viewport renders', status: 'PASS' });

    // Test 5: Check API health endpoint
    console.log('Test 5: Checking API health...');
    const response = await page.request.get('http://localhost:8000/api/health');
    if (response.ok()) {
      const data = await response.json();
      if (data.status === 'ok') {
        results.push({ test: 'API health check', status: 'PASS' });
      } else {
        results.push({ test: 'API health check', status: 'FAIL', reason: `Status: ${data.status}` });
      }
    } else {
      results.push({ test: 'API health check', status: 'FAIL', reason: `HTTP ${response.status()}` });
    }

  } catch (error) {
    console.error('Error during manual checks:', error);
    results.push({ test: 'Manual verification', status: 'FAIL', reason: error.message });
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n=== Manual Verification Results ===');
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✓' : '✗';
    console.log(`${status} ${result.test}: ${result.status}`);
    if (result.reason) {
      console.log(`  Reason: ${result.reason}`);
    }
  });

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\nOverall: ${allPassed ? 'PASS' : 'FAIL'}`);

  return allPassed ? 0 : 1;
}

// Run the checks
runManualChecks()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
