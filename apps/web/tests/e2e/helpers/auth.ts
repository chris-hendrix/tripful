import type { Page, APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:8000/api";

/**
 * Create a user via API (request-code → verify-code → complete-profile).
 * Returns the cookie string for subsequent API calls.
 */
export async function createUserViaAPI(
  request: APIRequestContext,
  phone: string,
  displayName: string = "Test User",
): Promise<string> {
  await request.post(`${API_BASE}/auth/request-code`, {
    data: { phoneNumber: phone },
  });

  const verifyResponse = await request.post(`${API_BASE}/auth/verify-code`, {
    data: { phoneNumber: phone, code: "123456" },
  });

  const cookies = verifyResponse.headers()["set-cookie"];

  await request.post(`${API_BASE}/auth/complete-profile`, {
    data: { displayName, timezone: "UTC" },
    headers: { cookie: cookies || "" },
  });

  return cookies || "";
}

/**
 * Login via the browser UI (enter phone → verify code).
 * Assumes the user already exists (created via API or previous browser flow).
 * Ends on /dashboard.
 */
export async function loginViaBrowser(
  page: Page,
  phone: string,
): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

/**
 * Full authentication: create user via API, then login via browser.
 * Returns the phone number used.
 */
export async function authenticateUser(
  page: Page,
  request: APIRequestContext,
  displayName: string = "Test User",
): Promise<string> {
  const phone = `+1555${Date.now()}`;
  await createUserViaAPI(request, phone, displayName);
  await loginViaBrowser(page, phone);
  return phone;
}

/**
 * Full authentication with a specific phone number.
 * Creates user via API, then logs in via browser.
 */
export async function authenticateUserWithPhone(
  page: Page,
  request: APIRequestContext,
  phone: string,
  displayName: string = "Test User",
): Promise<void> {
  await createUserViaAPI(request, phone, displayName);
  await loginViaBrowser(page, phone);
}

/**
 * Browser-only authentication (no API request context needed).
 * Handles both new users (complete-profile) and existing users.
 * Returns the phone number used.
 */
export async function authenticateUserViaBrowser(
  page: Page,
  displayName: string = "Test User",
): Promise<string> {
  const phone = `+1555${Date.now()}`;

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await Promise.race([
    page.waitForURL("**/dashboard"),
    page.waitForURL("**/complete-profile"),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/dashboard");
  }

  return phone;
}

/**
 * Browser-only authentication with a specific phone number.
 * Handles both new users (complete-profile) and existing users.
 */
export async function authenticateUserViaBrowserWithPhone(
  page: Page,
  phone: string,
  displayName: string = "Test User",
): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await Promise.race([
    page.waitForURL("**/dashboard"),
    page.waitForURL("**/complete-profile"),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/dashboard");
  }
}
