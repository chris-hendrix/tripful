/**
 * Named constants for E2E tests.
 * Centralizes wait durations and shared configuration values.
 */

/**
 * Base URL for the API server used in E2E test setup (user creation, trip creation, etc.).
 */
export const API_BASE = "http://localhost:8000/api";

/**
 * Timeout for page navigation — waiting for URL changes, heading visibility after route transition.
 * Set to 15s to accommodate Next.js SSR + React hydration + TanStack Query initial data fetch.
 */
export const NAVIGATION_TIMEOUT = 15_000;

/**
 * Timeout for UI element visibility — waiting for elements to appear after user actions
 * (e.g., message posted, toast shown, reaction toggled).
 * Set to 10s to accommodate API round-trip + polling interval (5s for messages, 30s for notifications).
 */
export const ELEMENT_TIMEOUT = 10_000;

/**
 * Timeout for toast dismissal — waiting for Sonner toasts to auto-dismiss.
 * Sonner default auto-close is ~4s; 10s provides safety margin for slow CI environments.
 */
export const TOAST_TIMEOUT = 10_000;

/**
 * Timeout for dialog close — waiting for dialog/popover hide animation after Escape/click-outside.
 * Set to 5s as dialogs close synchronously via CSS transition (~200ms), with extra margin for CI.
 */
export const DIALOG_TIMEOUT = 5_000;

/**
 * Extended navigation timeout for multi-step server operations (delete + redirect).
 */
export const SLOW_NAVIGATION_TIMEOUT = 20_000;

/**
 * Inner assertion timeout for .toPass() retry loops and menu retry probes.
 */
export const RETRY_INTERVAL = 3_000;

/**
 * Quick visibility probe for conditional UI checks that fall back gracefully.
 */
export const PROBE_TIMEOUT = 2_000;

/**
 * Fast timeout for verifying optimistic UI updates that should appear near-instantly.
 */
export const OPTIMISTIC_TIMEOUT = 1_000;
