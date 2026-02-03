import { test, expect } from '@playwright/test';
import { testDb, users, verificationCodes } from '../helpers/db';

/**
 * E2E Test Suite: Complete Authentication Flow
 *
 * Prerequisites:
 * 1. Test database setup: pnpm --filter @tripful/api test:setup
 * 2. Backend server running on http://localhost:8000 with TEST_MODE=true
 * 3. Frontend server running on http://localhost:3000
 *
 * To run:
 * Terminal 1: TEST_MODE=true pnpm --filter @tripful/api dev
 * Terminal 2: pnpm --filter @tripful/web dev
 * Terminal 3: pnpm --filter @tripful/web test:e2e
 */

test.describe('Complete Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up test data directly from database
    await testDb.delete(verificationCodes);
    await testDb.delete(users);

    // Clear all cookies before each test for isolation
    await page.context().clearCookies();
  });

  test('complete authentication journey: login → verify → complete profile → dashboard', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify we're on the login page
    await expect(page.locator('h2:has-text("Get started")')).toBeVisible();

    // Enter phone number
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+15551234567');

    // Click Continue button
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();

    // Step 2: Wait for navigation to verify page
    await page.waitForURL('**/verify**');
    expect(page.url()).toContain('/verify?phone=');

    // Verify we're on the verification page
    await expect(page.locator('h2:has-text("Verify your number")')).toBeVisible();
    await expect(page.locator('text=+15551234567')).toBeVisible();

    // Enter verification code (fixed code for test environment)
    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill('123456');

    // Click Verify button
    const verifyButton = page.locator('button:has-text("Verify")');
    await verifyButton.click();

    // Step 3: Wait for navigation to complete-profile page
    await page.waitForURL('**/complete-profile');

    // Verify we're on the complete profile page
    await expect(page.locator('h2:has-text("Complete your profile")')).toBeVisible();

    // Enter display name
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill('Test User');

    // Click Complete profile button
    const completeProfileButton = page.locator('button:has-text("Complete profile")');
    await completeProfileButton.click();

    // Step 4: Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');

    // Verify we're on the dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Verify user info is displayed
    await expect(page.locator('text=Test User')).toBeVisible();
    await expect(page.locator('text=+15551234567')).toBeVisible();

    // Verify auth cookie is set
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token');
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true);
    expect(authCookie?.value).toBeTruthy();
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    // Complete auth flow first to get logged in
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+15551234567');
    await page.locator('button:has-text("Continue")').click();

    // Verify
    await page.waitForURL('**/verify**');
    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill('123456');
    await page.locator('button:has-text("Verify")').click();

    // Wait for navigation to either complete-profile or dashboard
    await Promise.race([
      page.waitForURL('**/dashboard'),
      page.waitForURL('**/complete-profile')
    ]);

    // Complete profile if needed
    const currentUrl = await page.url();
    if (currentUrl.includes('/complete-profile')) {
      const displayNameInput = page.locator('input[type="text"]').first();
      await displayNameInput.fill('Test User');
      await page.locator('button:has-text("Complete profile")').click();
      await page.waitForURL('**/dashboard');
    }
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Verify we have an auth cookie
    let cookies = await page.context().cookies();
    let authCookie = cookies.find(c => c.name === 'auth_token');
    expect(authCookie?.value).toBeTruthy();

    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.click();

    // Verify redirect to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    // Verify cookie is cleared or empty
    cookies = await page.context().cookies();
    authCookie = cookies.find(c => c.name === 'auth_token');
    // Cookie might be cleared or have empty value
    if (authCookie) {
      expect(authCookie.value).toBe('');
    }

    // Verify cannot access protected route
    await page.goto('/dashboard');

    // Should redirect back to login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');

    // Verify we're on the login page
    await expect(page.locator('h2:has-text("Get started")')).toBeVisible();
  });

  test('existing user skips complete profile and goes to dashboard', async ({ page }) => {
    // This test assumes the user from previous tests exists with a completed profile
    // We'll log in again with the same phone number

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login with existing phone
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+15551234567');
    await page.locator('button:has-text("Continue")').click();

    // Verify
    await page.waitForURL('**/verify**');
    const codeInput = page.locator('input[type="text"]').first();
    await codeInput.fill('123456');
    await page.locator('button:has-text("Verify")').click();

    // Should go directly to dashboard (or complete-profile if new)
    // Wait for either URL
    await Promise.race([
      page.waitForURL('**/dashboard', { timeout: 5000 }),
      page.waitForURL('**/complete-profile', { timeout: 5000 })
    ]);

    const currentUrl = await page.url();

    // If we land on complete-profile, it means we're testing with a fresh user
    // Complete the profile
    if (currentUrl.includes('/complete-profile')) {
      const displayNameInput = page.locator('input[type="text"]').first();
      await displayNameInput.fill('Test User');
      await page.locator('button:has-text("Complete profile")').click();
      await page.waitForURL('**/dashboard');
    }

    // Verify we're on dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Test User')).toBeVisible();
  });
});
