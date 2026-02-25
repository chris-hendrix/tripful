# Progress: Mutuals Invite

## Iteration 1 — Task 1.1: Add mutuals types/schemas and update notification/invitation shared code

**Status**: ✅ COMPLETE

### What was done

**New files created:**
- `shared/types/mutuals.ts` — `Mutual` interface and `GetMutualsResponse` type with full JSDoc
- `shared/schemas/mutuals.ts` — `getMutualsQuerySchema` and `getMutualSuggestionsQuerySchema` with cursor pagination, search, and limit support; inferred types exported

**Modified files:**
- `shared/types/notification.ts` — Added `"mutual_invite"` and `"sms_invite"` to `NotificationType` union
- `shared/types/invitation.ts` — Added optional `addedMembers?: { userId: string; displayName: string }[]` to `CreateInvitationsResponse`
- `shared/types/index.ts` — Added re-exports for `Mutual` and `GetMutualsResponse`
- `shared/schemas/notification.ts` — Added `"mutual_invite"` and `"sms_invite"` to notification type `z.enum`
- `shared/schemas/invitation.ts` — Rewrote `createInvitationsSchema` to accept optional `phoneNumbers` + optional `userIds` with `.refine()` requiring at least one; added `addedMembers` (`.optional().default([])`) to `createInvitationsResponseSchema`
- `shared/schemas/index.ts` — Added re-exports for mutuals schemas and inferred types
- `apps/web/src/components/notifications/notification-item.tsx` — Added `UserPlus` icon for `mutual_invite` and `sms_invite` in `typeIcons` Record (pulled forward from Task 4.1 to prevent TypeScript error from exhaustive Record)

**Tests updated:**
- `shared/__tests__/invitation-schemas.test.ts` — Rewrote `createInvitationsSchema` tests: 14 cases covering phone-only, userId-only, mixed, empty-both-rejected, boundary limits, invalid formats (5 E.164 edge cases), non-array rejection, and default value application
- `shared/__tests__/exports.test.ts` — Updated `CreateInvitationsInput` usage, added mutuals schema export tests

### Verification results
- Shared package build: PASS
- Tests: 2364 total (shared: 231, api: 1004, web: 1129) — all passing
- Lint: PASS (1 pre-existing warning in unrelated API test file)
- Typecheck: PASS (all 3 packages)

### Design decisions
- `addedMembers` made optional in both TypeScript type and Zod response schema (`.optional().default([])`) because the backend controller doesn't return it yet — Task 2.2 will populate it
- `notification-item.tsx` updated early (Task 4.1 scope) to prevent `Record<NotificationType, ElementType>` compile error when NotificationType union expanded
- `createInvitationsSchema` uses `.optional().default([])` on both arrays so consumers can omit either field; the `.refine()` ensures at least one has entries

### Learnings for future iterations
- When adding members to a union type used in a `Record<UnionType, ...>`, ALL downstream exhaustive records must be updated in the same task to keep typecheck passing
- The `turbo run test` command may fail API tests due to transient DB connection timing — running `pnpm --filter @tripful/api test` individually works; this is a pre-existing devcontainer issue
- Test imports in the shared package use `.js` extension: `from "../schemas/index.js"`

## Iteration 2 — Task 2.1: Implement mutuals service, controller, and routes with tests

**Status**: ✅ COMPLETE

### What was done

**New files created:**
- `apps/api/src/services/mutuals.service.ts` — `IMutualsService` interface and `MutualsService` class with `getMutuals` and `getMutualSuggestions` methods. Core query uses Drizzle `sql` template tag for self-join on `members` table to find users sharing trips. Keyset cursor pagination on `(shared_trip_count DESC, display_name ASC, id ASC)` with base64-encoded JSON cursor. Batch-loads shared trips in a single query to avoid N+1. Supports `search` prefix filter and `tripId` filter.
- `apps/api/src/controllers/mutuals.controller.ts` — Controller object with `getMutuals` and `getMutualSuggestions` handlers following existing pattern (typed error re-throw, unknown error logging + 500)
- `apps/api/src/routes/mutuals.routes.ts` — Route definitions for `GET /mutuals` (auth + rate limit) and `GET /trips/:tripId/mutual-suggestions` (auth + complete profile + rate limit) with Zod schema validation
- `apps/api/src/plugins/mutuals-service.ts` — Fastify plugin using `fastify-plugin` with dependencies on `database` and `permissions-service`
- `apps/api/tests/unit/mutuals.service.test.ts` — 9 unit tests covering core query sorting, cursor pagination, search filtering, trip filtering, empty results, shared trips population, suggestions exclusion, permission denied, and suggestion search
- `apps/api/tests/integration/mutuals.routes.test.ts` — 8 integration tests covering auth requirements (401), paginated response shape, search/trip filters, empty results, suggestion exclusion, and organizer-only access (403)

**Modified files:**
- `apps/api/src/types/index.ts` — Added `IMutualsService` import and `mutualsService` property to `FastifyInstance` module augmentation
- `apps/api/src/app.ts` — Imported and registered `mutualsServicePlugin` (after permissions-service) and `mutualsRoutes` (with `/api` prefix)

### Verification results
- Tests: 2381 total (shared: 231, api: 1021, web: 1129) — all passing
- Mutuals-specific: 17 tests (9 unit + 8 integration) — all passing
- Lint: PASS (no new errors; 1 pre-existing warning in unrelated file)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment
- **APPROVED** — Excellent pattern consistency with existing codebase
- SQL correctness verified: self-join, GROUP BY, keyset pagination all correct
- No SQL injection risk (all inputs parameterized via Drizzle `sql` tag)
- Security: proper organizer permission check in `getMutualSuggestions`
- No `any` casts anywhere; clean type safety
- Two LOW severity notes (non-blocking): cursor decode could return 400 instead of 500 on malformed input; `shared_trip_count` always 1 when `tripId` filter is active (intentional per architecture)

### Design decisions
- First cursor-based pagination in the codebase — used keyset approach with base64 JSON encoding for the 3-part cursor `{count, name, id}`
- Used Drizzle `sql` template tag for complex self-join query rather than the query builder, as the self-join with aliased tables and HAVING clause is more naturally expressed in raw SQL
- `getMutualSuggestions` checks organizer permission via `permissionsService.isOrganizer()` before executing query
- Batch-loaded shared trips in a single query for all mutuals on the page, avoiding N+1
- Used `exactOptionalPropertyTypes`-safe conditional spread for optional query params in controller

### Learnings for future iterations
- Drizzle's `db.execute<T>()` returns rows typed as `T` — use this for complex raw SQL queries where the query builder would be unwieldy
- PostgreSQL `COUNT` returns `bigint` which node-postgres serializes as string — must convert with `Number()` before use
- The `HAVING` clause must use the full aggregate expression (e.g., `COUNT(DISTINCT ...)`) not a column alias, as PostgreSQL doesn't allow aliases in HAVING
- The turbo parallel runner flakiness persists (pre-existing) — running per-package tests individually is reliable
