import type { Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  "../../../playwright-screenshots",
);

const isCI = !!process.env.CI;

const DESKTOP = { width: 1280, height: 1080 };
const MOBILE = { width: 375, height: 667 };

/** Capture desktop + mobile JPG screenshots. No-op in CI. */
export async function snap(page: Page, name: string): Promise<void> {
  if (isCI) return;
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const original = page.viewportSize() ?? DESKTOP;

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}-desktop.jpg`),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });

  await page.setViewportSize(MOBILE);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}-mobile.jpg`),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });

  await page.setViewportSize(original);
}
