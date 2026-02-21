# Progress: Skill Audit Fixes

## Iteration 1 — Task 1.1: Add viewport export, mobile meta, noscript, page metadata, and hidePoweredBy

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Added `Viewport` type import, `viewport` export (width, initialScale, maximumScale, themeColor), extended `metadata` with `appleWebApp` config, added `<noscript>` fallback block |
| `apps/web/src/app/(auth)/verify/layout.tsx` | NEW — metadata wrapper layout (`{ title: "Verify" }`) for client component page |
| `apps/web/src/app/(auth)/complete-profile/layout.tsx` | NEW — metadata wrapper layout (`{ title: "Complete Profile" }`) for client component page |
| `apps/api/src/app.ts` | Added `hidePoweredBy: true` to `@fastify/helmet` registration config |

### Key Decisions

- **Layout wrapper pattern for metadata**: The verify and complete-profile pages are `"use client"` components that cannot export `metadata` directly. Created `layout.tsx` files in their directories that export metadata and pass through children — this is the idiomatic Next.js App Router pattern.
- **Noscript uses inline styles**: Since CSS may not be available when JS is disabled, the noscript block uses inline `style` attributes rather than Tailwind classes.
- **hidePoweredBy explicit**: While `@fastify/helmet` v13 enables this by default, setting it explicitly documents security intent.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unrelated to this task): daily-itineraries worker (10), app-header nav (5), trip metadata (1), URL validation dialogs (2)
- **Reviewer**: APPROVED — all 6 requirements met, clean code

### Learnings for Future Iterations

- `"use client"` pages cannot export `metadata` — use a `layout.tsx` wrapper in the same directory
- Pre-existing test failures: daily-itineraries worker (10 tests, time-dependent), app-header nav (5), trip metadata (1), create-accommodation/event URL validation dialogs (2 total) — all on main branch
- Turbo caches typecheck and lint results; tests always run fresh

## Iteration 2 — Task 1.2: Remove phone from JWT payload and add cache-control headers

**Status**: COMPLETED
**Date**: 2026-02-20

### Changes Made

| File | Change |
|------|--------|
| `apps/api/src/services/auth.service.ts` | Removed `phone: user.phoneNumber` from JWT payload in `generateToken()`, updated docstring |
| `apps/api/src/types/index.ts` | Removed `phone: string` from `JWTPayload` interface |
| `apps/api/src/middleware/auth.middleware.ts` | Updated comment to remove `phone` from listed JWT fields |
| `apps/api/src/routes/auth.routes.ts` | Added `onSend` hook setting `Cache-Control: no-store, no-cache, must-revalidate` and `Pragma: no-cache` on all auth routes |
| `apps/api/tests/unit/auth.service.test.ts` | Replaced phone assertions with `not.toHaveProperty("phone")`, removed phone from jwt.sign() |
| `apps/api/tests/integration/security.test.ts` | Removed phone from jwt.sign(), added Cache-Control header test |
| `apps/api/tests/integration/auth.middleware.test.ts` | Removed phone from all jwt.sign() calls and phone assertions |
| `apps/api/tests/integration/auth.complete-profile.test.ts` | Removed phone from jwt.sign(), changed assertion to not.toHaveProperty |
| `apps/api/tests/integration/auth.me-logout.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/auth.verify-code.test.ts` | Changed phone assertion to not.toHaveProperty |
| `apps/api/tests/integration/config-and-improvements.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/trip.routes.test.ts` | Removed phone/phoneNumber from all jwt.sign() calls (16 instances) |
| `apps/api/tests/integration/event.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/invitation.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/message.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/accommodation.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/member-travel.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/notification.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/update-member-role.routes.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/drizzle-improvements.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/notification-hooks.test.ts` | Removed phone from all jwt.sign() calls |
| `apps/api/tests/integration/user.routes.test.ts` | Removed phone from all jwt.sign() calls |

### Key Decisions

- **onSend hook for cache-control**: Used a Fastify `onSend` hook at the auth route plugin scope level rather than per-route header setting. This ensures all 5 auth endpoints (`request-code`, `verify-code`, `complete-profile`, `me`, `logout`) get cache-control headers automatically, including any future endpoints added to the auth plugin.
- **Negative assertions**: Added `expect(decoded).not.toHaveProperty("phone")` in key tests rather than just removing phone assertions — this actively verifies the security improvement.
- **Both `phone:` and `phoneNumber:` keys**: Initial implementation caught `phone:` keys but missed 4 instances using `phoneNumber:` as the key in jwt.sign() calls in trip.routes.test.ts. These were caught by reviewer and fixed in the same iteration.

### Verification Results

- **TypeScript**: 0 errors across all 3 packages (shared, api, web)
- **Linting**: 0 errors across all 3 packages
- **Tests**: All pass. 18 pre-existing failures (unchanged from iteration 1): daily-itineraries worker (10), app-header nav (5), trip metadata (1), URL validation dialogs (2)
- **Reviewer**: APPROVED after fix round — all phone references removed from JWT contexts, cache-control headers correctly implemented

### Learnings for Future Iterations

- Test files may use variant key names (`phone:` vs `phoneNumber:`) — always search for both patterns when doing security-related removals
- Fastify `onSend` hooks registered inside a route plugin are scoped to that plugin's routes — a clean pattern for adding response headers to a group of related endpoints
- No code anywhere accessed `request.user.phone` downstream — the phone in JWT was unused PII, making removal safe with zero runtime impact
