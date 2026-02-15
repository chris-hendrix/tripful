import type { Page, APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:8000/api";

let phoneCounter = 0;

/** Generate a unique E.164 phone number (max 15 digits). */
export function generateUniquePhone(): string {
  const ts = Date.now().toString().slice(-7);
  const counter = (++phoneCounter % 1000).toString().padStart(3, "0");
  return `+1555${ts}${counter}`;
}

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
 * Ends on /trips.
 */
export async function loginViaBrowser(
  page: Page,
  phone: string,
): Promise<void> {
  await page.goto("/login");

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await page.waitForURL("**/trips", { timeout: 10000 });
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
  const phone = generateUniquePhone();
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
 * Fast API-based authentication: create user via API and inject auth cookie.
 * Skips browser navigation entirely — much faster than browser-based auth.
 * Returns the phone number used.
 */
export async function authenticateViaAPI(
  page: Page,
  request: APIRequestContext,
  displayName: string = "Test User",
): Promise<string> {
  const phone = generateUniquePhone();
  const cookieString = await createUserViaAPI(request, phone, displayName);
  const token = cookieString.match(/auth_token=([^;]+)/)?.[1] || "";
  await page.context().addCookies([
    {
      name: "auth_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
  await page.goto("/trips");
  await page.waitForURL("**/trips", { timeout: 10000 });
  // Wait for React hydration + data load (trip count only renders after TanStack Query resolves)
  await page.getByText(/\d+ trips?/).waitFor({ timeout: 10000 });
  // Ensure page is fully interactive — SSR prefetch via HydrationBoundary can
  // render trip count in initial HTML before React attaches event handlers
  await page.waitForLoadState("networkidle");
  return phone;
}

/**
 * Fast API-based authentication with a specific phone number.
 * Skips browser navigation entirely.
 */
export async function authenticateViaAPIWithPhone(
  page: Page,
  request: APIRequestContext,
  phone: string,
  displayName: string = "Test User",
): Promise<void> {
  const cookieString = await createUserViaAPI(request, phone, displayName);
  const token = cookieString.match(/auth_token=([^;]+)/)?.[1] || "";
  await page.context().addCookies([
    {
      name: "auth_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
  await page.goto("/trips");
  await page.waitForURL("**/trips", { timeout: 10000 });
  // Wait for React hydration + data load (trip count only renders after TanStack Query resolves)
  await page.getByText(/\d+ trips?/).waitFor({ timeout: 10000 });
  // Ensure page is fully interactive — SSR prefetch via HydrationBoundary can
  // render trip count in initial HTML before React attaches event handlers
  await page.waitForLoadState("networkidle");
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
  const phone = generateUniquePhone();

  await page.goto("/login");

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await Promise.race([
    page.waitForURL("**/trips"),
    page.waitForURL("**/complete-profile"),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/trips");
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

  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill(phone);
  await page.locator('button:has-text("Continue")').click();

  await page.waitForURL("**/verify**");
  const codeInput = page.locator('input[type="text"]').first();
  await codeInput.fill("123456");
  await page.locator('button:has-text("Verify")').click();

  await Promise.race([
    page.waitForURL("**/trips"),
    page.waitForURL("**/complete-profile"),
  ]);

  const currentUrl = page.url();
  if (currentUrl.includes("/complete-profile")) {
    const displayNameInput = page.locator('input[type="text"]').first();
    await displayNameInput.fill(displayName);
    await page.locator('button:has-text("Complete profile")').click();
    await page.waitForURL("**/trips");
  }
}
