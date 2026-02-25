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

## Iteration 3 — Task 2.2: Extend invitation service for mutual invites and sms_invite notifications with tests

**Status**: ✅ COMPLETE

### What was done

**Modified files:**

- `apps/api/src/errors.ts` — Added `NotAMutualError` error class (403 status) for rejecting non-mutual userId invites
- `apps/api/src/services/invitation.service.ts` — Extended `IInvitationService` interface and `createInvitations` implementation:
  - Added `userIds` parameter (optional, defaults to `[]`) for backwards compatibility
  - Fetches inviter display name and trip name for notification body text
  - **userIds flow**: Verifies each userId is a mutual via `members` self-join query, rejects non-mutuals with `NotAMutualError`, skips existing trip members, creates `members` records with `status: 'no_response'`, sends `mutual_invite` notification
  - **phoneNumbers flow enhancement**: Sends `sms_invite` notification for existing users who get auto-added as members
  - Member limit enforcement counts both phone + userId flows combined
  - Returns `addedMembers` array containing both mutual-invited and phone-auto-added users
  - Notifications sent outside transaction with try/catch (best-effort, don't break invitation on notification failure)
- `apps/api/src/controllers/invitation.controller.ts` — Updated `createInvitations` handler to extract `userIds` from body, pass to service, include `addedMembers` in 201 response
- `apps/web/tests/e2e/notifications.spec.ts` — Updated notification count assertions from 2→3 to account for new `sms_invite` notification (1 sms_invite + 2 trip_message = 3 total)

**Tests added:**

- `apps/api/tests/unit/invitation.service.test.ts` — 8 new unit tests in `createInvitations (mutual invites via userIds)` describe block:
  1. Mutual invite creates member record + `mutual_invite` notification
  2. SMS invite creates `sms_invite` notification for existing user auto-added via phone
  3. Mixed invites (both userIds and phoneNumbers)
  4. Member limit enforcement across combined flows
  5. Non-mutual userId rejected with `NotAMutualError`
  6. Skip existing members for userIds
  7. `addedMembers` includes both mutual-added and phone-auto-added users
  8. Backwards compatibility (phone-only returns empty `addedMembers`)
- `apps/api/tests/integration/invitation.routes.test.ts` — 5 new integration tests in `POST /api/trips/:tripId/invitations (mutual invites)` describe block:
  1. Mutual-only payload returns 201 with member record and notification
  2. Phone-only payload (backwards compat)
  3. Mixed payload with both phones and userIds
  4. `sms_invite` notification verification for phone auto-added users
  5. Non-mutual userId returns 403

### Verification results

- Shared tests: 231 passing (12 files)
- API tests: 1034 passing (48 files)
- Web tests: 1129 passing (62 files)
- E2E tests: 21 passing (all green)
- Total: 2394 unit/integration + 21 E2E = 2415 tests — all passing
- Lint: PASS (0 errors, 1 pre-existing warning)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment

- **APPROVED** — Clean separation of flows, parameterized queries (no SQL injection), proper backwards compatibility, notification body matches spec exactly, comprehensive test coverage
- Four LOW severity notes (all non-blocking):
  1. `NotAMutualError` message includes target userId — low risk since caller already knows the ID
  2. Inviter/trip lookups outside transaction — acceptable with fallback values
  3. Integration tests don't explicitly clean up (matches existing pattern)
  4. `phoneNumbers` destructuring relies on schema `.default([])` — correct since Fastify validates body through schema

### Design decisions

- `userIds` parameter defaults to `[]` for full backwards compatibility — no changes needed to existing callers
- Mutual verification uses a self-join on `members` table (same pattern as mutuals service) rather than importing the mutuals service
- Notifications sent outside the DB transaction to avoid holding locks, with try/catch to prevent notification failures from breaking the invitation flow
- `addedMembers` response includes users from BOTH flows (mutual-invited and phone-auto-added)
- E2E notification test updated to expect 3 unread notifications (was 2) — the `sms_invite` adds 1 notification when a user is invited via phone

### Learnings for future iterations

- When adding new notification types that fire during existing flows (e.g., `sms_invite` during phone invites), check ALL E2E tests that count notifications — they will need count adjustments
- The turbo runner still fails with `DATABASE_URL` not being passed through — this is a pre-existing `turbo.json` configuration issue (`passThroughEnv` missing). Run tests per-package to avoid this
- The `members` self-join pattern for mutual verification is efficient: `SELECT user_id FROM members m1 JOIN members m2 ON m1.trip_id = m2.trip_id WHERE m1.user_id = :inviter AND m2.user_id IN (:userIds)` — reusable for any mutual check

## Iteration 4 — Task 3.1: Implement mutuals page with query hooks, search, filter, and infinite scroll

**Status**: ✅ COMPLETE

### What was done

**New files created:**

- `apps/web/src/hooks/mutuals-queries.ts` — Query key factory (`mutualKeys`) with hierarchical keys (`all`, `lists`, `list`, `suggestions`, `suggestion`) and two query option factories: `mutualsQueryOptions` using `infiniteQueryOptions` (first infinite query in the codebase) with cursor-based pagination, and `mutualSuggestionsQueryOptions` using regular `queryOptions` with `enabled: !!tripId` guard
- `apps/web/src/hooks/use-mutuals.ts` — `"use client"` hook file exporting `useMutuals(params)` wrapping `useInfiniteQuery` and `useMutualSuggestions(tripId)` wrapping `useQuery`. Re-exports keys and options for convenience
- `apps/web/src/app/(app)/mutuals/page.tsx` — Server component page with metadata `{ title: "My Mutuals | Tripful" }`, renders `<MutualsContent />` (no server prefetch for infinite queries)
- `apps/web/src/app/(app)/mutuals/mutuals-content.tsx` — Client component with search input (300ms debounce via `useState`/`useEffect`), trip filter dropdown (populated from `useTrips()`), avatar grid of mutual cards, loading skeletons, error state with retry button, empty state, infinite scroll via `IntersectionObserver` sentinel div, and proper pluralization
- `apps/web/src/hooks/__tests__/use-mutuals.test.tsx` — 8 hook tests covering: first page fetch, cursor-based pagination with `fetchNextPage`, search parameter passing, tripId filter, API error handling, empty results, suggestions fetch, disabled state when tripId is empty
- `apps/web/src/app/(app)/mutuals/mutuals-content.test.tsx` — 8 component tests covering: loading skeletons, no count during loading, mutuals grid rendering, singular/plural text, empty state, error state with retry, retry click handler, debounced search input

### Verification results

- Shared tests: 231 passing (12 files)
- API tests: 1034 passing (48 files)
- Web tests: 1145 passing (64 files), including 16 new tests (8 hook + 8 component)
- E2E tests: 21 passing
- Lint: PASS (0 new errors; 1 pre-existing warning in unrelated file)
- Typecheck: PASS (all 3 packages)
- Shared package build: PASS

### Reviewer assessment

- **APPROVED** — Excellent pattern consistency with existing codebase
- Three LOW severity notes (all non-blocking):
  1. No server-side prefetch in page component — acceptable given infinite query hydration complexity; task spec only requires "server component with metadata"
  2. `mutualCount` shows count of currently-loaded mutuals, not server total — minor UX concern, non-blocking
  3. `"use client"` in hook file technically redundant but consistent with existing `use-trips.ts` pattern
- Optional suggestions: consider `useMemo` for page flattening, add trip filter dropdown test, add keyboard accessibility to cards when click handler is added in Task 3.2

### Design decisions

- First `useInfiniteQuery` / `infiniteQueryOptions` usage in the codebase — used TanStack Query v5 API with `initialPageParam: undefined as string | undefined` and `getNextPageParam` returning `nextCursor ?? undefined`
- No server-side prefetch for the mutuals page — infinite query hydration requires special handling that isn't worth the complexity for this page. Client-side fetch with skeleton loading provides good UX
- Search uses local state debounce (not URL sync) because infinite queries reset on parameter change — URL sync would cause unnecessary refetches on browser back/forward
- Trip filter dropdown uses `"all"` as sentinel value since Radix UI Select doesn't support empty string values; handler converts back to `""`
- IntersectionObserver sentinel div at bottom of grid triggers `fetchNextPage()` when visible — guards with `hasNextPage && !isFetchingNextPage` to prevent duplicate fetches
- Mutual cards have `cursor-pointer` but no click handler yet — Task 3.2 will add the profile sheet click handler with keyboard accessibility

### Learnings for future iterations

- TanStack Query v5's `infiniteQueryOptions()` is the analog of `queryOptions()` for infinite queries — must provide `initialPageParam` and `getNextPageParam` as required generic parameters
- When using `useInfiniteQuery`, flatten pages for rendering with `data?.pages.flatMap((page) => page.items) ?? []` — consider wrapping in `useMemo` for performance if the component has frequent unrelated re-renders
- IntersectionObserver in tests requires a mock since jsdom doesn't provide it — mock at module level in `beforeEach` and store the callback to manually trigger intersection in tests
- The `Select` component from Radix UI does not support empty string as a value — use a sentinel string like `"all"` and convert in the change handler
- Pre-existing turbo parallel runner flakiness continues — run per-package tests individually for reliable results

## Iteration 5 — Task 3.2: Implement mutual profile sheet and app header menu item

**Status**: ✅ COMPLETE

### What was done

**New files created:**

- `apps/web/src/components/mutuals/mutual-profile-sheet.tsx` — Sheet component showing large avatar (size-20), display name as SheetTitle with Playfair font, shared trip count subtitle, and list of shared trips as clickable `<Link>` elements to `/trips/:id`. Props: `{ mutual: Mutual | null; open: boolean; onOpenChange: (open: boolean) => void }`. Follows the ProfileDialog pattern exactly.
- `apps/web/src/components/mutuals/__tests__/mutual-profile-sheet.test.tsx` — 8 tests covering: display name rendering, large avatar with initials, avatar fallback when no photo, plural/singular trip count text, shared trip link hrefs, null mutual state, and closed state.

**Modified files:**

- `apps/web/src/app/(app)/mutuals/mutuals-content.tsx` — Added `selectedMutual` state (`useState<Mutual | null>`), click handler and keyboard accessibility (`role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space) to mutual card divs, and rendered `<MutualProfileSheet>` at the bottom of the component with controlled open/close state.
- `apps/web/src/components/app-header.tsx` — Added `Users` icon import from lucide-react, added "My Mutuals" `DropdownMenuItem` with `asChild` wrapping a `<Link href="/mutuals">` with `data-testid="mutuals-menu-item"`, placed between profile item and separator.
- `apps/web/src/components/__tests__/app-header.test.tsx` — Added 2 tests: "shows My Mutuals link in dropdown" and "My Mutuals link points to /mutuals".
- `turbo.json` — Added `passThroughEnv` for `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` to the test pipeline to fix environment variable passthrough in Turborepo.

### Verification results

- Shared tests: 231 passing (12 files)
- API tests: 1034 passing (48 files)
- Web tests: 1155 passing (65 files), including 10 new tests (8 profile sheet + 2 app header)
- Lint: PASS (0 new errors; 1 pre-existing warning in unrelated API test file)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment

- **APPROVED** — Clean component design, correct type usage, proper null handling, keyboard accessibility on cards
- Two LOW severity notes (both non-blocking):
  1. Redundant icon classes on Users icon in app-header — FIXED post-review (removed `className="mr-2 h-4 w-4"` to match LogOut icon pattern)
  2. Missing test for card click opening profile sheet in mutuals-content — noted as non-blocking since the sheet itself is well-tested independently
- Optional suggestion: consider auto-closing sheet on trip link navigation (UX polish, not a bug)

### Design decisions

- MutualProfileSheet follows the ProfileDialog pattern exactly: controlled `open`/`onOpenChange` props, same Sheet structure, same Playfair font title, same size-20 avatar
- Card keyboard accessibility follows event-card.tsx/accommodation-card.tsx pattern: `role="button"`, `tabIndex={0}`, `onKeyDown` with Enter/Space handling and `e.preventDefault()`
- No dynamic import for the sheet — it's only used on the mutuals page (already mutuals-specific), so code splitting benefit is minimal
- Sheet displays data from the already-fetched Mutual object (no additional API call needed since `sharedTrips` is included in the list response)
- `Users` icon in dropdown uses no explicit size classes, matching the `LogOut` icon pattern (shadcn DropdownMenuItem auto-sizes SVG children via CSS)

### Learnings for future iterations

- shadcn `DropdownMenuItem` applies `gap-2` and `[&_svg:not([class*='size-'])]:size-4` automatically — adding `mr-2 h-4 w-4` to icons is redundant and creates double spacing
- Radix `Avatar` doesn't render `<img>` in jsdom (images don't load in test environment) — test avatar via the fallback initials and size class assertions instead
- For controlled Sheet components receiving nullable data, use `{data && (...)}` conditional rendering inside `SheetContent` rather than conditionally rendering the entire `Sheet` — this keeps the close animation working smoothly
- The `turbo.json` `passThroughEnv` configuration resolves the long-standing turbo runner flakiness — environment variables like `DATABASE_URL` were being stripped in parallel runs

## Iteration 6 — Task 4.1: Update invite dialog with mutuals picker and notification icons

**Status**: ✅ COMPLETE

### What was done

**Modified files:**
- `apps/web/src/components/trip/invite-members-dialog.tsx` — Major update: added two-section layout with mutuals picker at top and phone input below. Mutuals section includes searchable checkbox list with avatars, selected mutual badge chips, and "Or invite by phone number" separator. Only rendered when `useMutualSuggestions(tripId)` returns non-empty suggestions. Updated form defaults to include `userIds: []`, submit button enabled when either array is non-empty, success toast includes addedMembers count. Uses `useMemo` for filtered suggestions and selected mutuals lookup.
- `apps/web/src/hooks/use-invitations.ts` — Added `mutualKeys` import from `./mutuals-queries`. Updated `useInviteMembers` `onSettled` to also invalidate `mutualKeys.suggestion(tripId)`, `tripKeys.detail(tripId)`, and `tripKeys.all` (the trip detail invalidation was critical — `trip.memberCount` is rendered from the trip detail query, not the members list query).
- `apps/web/src/components/trip/__tests__/invite-members-dialog.test.tsx` — Updated mocks: added `getUploadUrl` to `@/lib/api` mock, `getInitials` to `@/lib/format` mock, new `@/hooks/use-mutuals` mock with `mockUseMutualSuggestions`. Added 10 new tests in "Mutuals section" describe block covering: show/hide based on suggestions, selecting/deselecting mutuals with chip verification, submit with only userIds, submit with both userIds and phoneNumbers, phone-only backwards compatibility, search filtering, success toast with addedMembers count, and form reset on dialog close. Updated mock data to use valid UUIDs for Zod schema validation.

**New files created:**
- `apps/web/tests/e2e/mutuals-journey.spec.ts` — E2E test with 3 steps: (1) view mutuals page and verify mutual is listed, (2) open invite dialog on a second trip and verify mutual suggestions appear, select a mutual, submit, verify toast, (3) verify mutual was added as trip member (member count increases to 2). Uses `inviteAndAcceptViaAPI` helper to establish mutual relationship in setup.

**No changes needed:**
- `apps/web/src/components/notifications/notification-item.tsx` — Already had `UserPlus` icon for `mutual_invite` and `sms_invite` types (done in Task 1.1)

### Verification results
- Shared tests: 231 passing (12 files)
- API tests: 1034 passing (48 files)
- Web tests: 1166 passing (65 files), including 10 new invite dialog tests
- E2E tests: 22 passing (including 1 new mutuals-journey test)
- Total: 2431 unit/integration + 22 E2E = 2453 tests — all passing
- Lint: PASS (0 new errors; 1 pre-existing warning in unrelated API test file)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment
- **APPROVED** — Consistent chip pattern matching phone chips, correct Avatar usage with getUploadUrl/getInitials, clean form data flow, comprehensive test coverage, proper accessibility (aria-labels on checkboxes and remove buttons), well-structured E2E test following established patterns
- Two LOW severity notes (both non-blocking):
  1. Missing empty state for filtered results when search text matches no mutuals — scrollable container renders empty. Could add "No mutuals found" text.
  2. Conditional AvatarImage rendering (`{mutual.profilePhotoUrl && ...}`) differs from members-list.tsx pattern which always renders AvatarImage — both approaches work, the always-render pattern is simpler.

### Design decisions
- Mutuals section is conditionally rendered based on `hasMutuals` boolean (`suggestions?.mutuals && suggestions.mutuals.length > 0`), keeping the phone-only experience unchanged when no suggestions exist
- Client-side search filtering via `useMemo` — appropriate since `useMutualSuggestions` returns all suggestions in a single non-paginated response
- `toggleMutual` handler manages `userIds` form array imperatively with `form.getValues`/`form.setValue`, matching the existing phone number management pattern
- Success toast uses `parts[]` array with `join(", ")` for clean comma-separated message: "X invitations sent, Y members added, Z already invited"
- Cache invalidation for `useInviteMembers` now includes `tripKeys.detail(tripId)` and `tripKeys.all` — this was the critical fix that resolved the E2E failure where `trip.memberCount` wasn't updating after mutual invite
- E2E test phone numbers use offset `+7000` to avoid collisions with other E2E tests that use 1000-6000

### Bug found and fixed during verification
- **Member count not updating after mutual invite**: Initial implementation only invalidated `memberKeys.list(tripId)` and `mutualKeys.suggestion(tripId)` after invitation. The trip detail page displays member count from `trip.memberCount` which comes from the trip detail query, not the members list. Fixed by also invalidating `tripKeys.detail(tripId)` and `tripKeys.all` in the `useInviteMembers` `onSettled` callback.

### Learnings for future iterations
- When a mutation changes data that appears on the trip detail page (like member count), always invalidate `tripKeys.detail(tripId)` and `tripKeys.all` — the trip detail endpoint aggregates data (memberCount, etc.) that isn't reflected in list queries
- Zod schema validation runs during form submission even in tests — mock data must use valid UUIDs (e.g., `00000000-0000-4000-8000-000000000001`) when the schema validates with `z.string().uuid()`
- The `useMutualSuggestions` hook returns a non-paginated response (all suggestions at once), so client-side search filtering with `useMemo` is the right approach rather than passing search params to the API
- E2E tests for UI mutations need the relevant cache invalidation to be in place before the test will pass — if a mutation result isn't visible in the UI, check what query feeds the display

## Iteration 7 — Task 5.1: Triage PROGRESS.md for unaddressed items

**Status**: ✅ COMPLETE

### What was done

Performed a comprehensive triage of all 6 iterations in PROGRESS.md, cataloguing every reviewer note, optional suggestion, deferred item, and bug across all phases. Classified each item as ACTIONABLE, INTENTIONAL, or COSMETIC.

**ACTIONABLE items — fix tasks created in TASKS.md:**

1. **Task 5.2: Return 400 instead of 500 for malformed cursor** (from Iteration 2 reviewer, LOW)
   - `decodeCursor` in `apps/api/src/services/mutuals.service.ts` throws unhandled SyntaxError on malformed base64/JSON input, which the controller catches as a generic 500. Should throw a 400 `InvalidCursorError` instead.

2. **Task 5.3: Add empty state for filtered mutuals in invite dialog** (from Iteration 6 reviewer, LOW)
   - When mutual search in the invite dialog matches no results, the scrollable container renders as an empty bordered box with no feedback message. Should show "No mutuals found" text.

3. **Task 5.4: Add missing mutuals page test coverage** (from Iterations 4 & 5 reviewers, LOW)
   - No test for clicking a mutual card and verifying the profile sheet opens (Iteration 5 gap).
   - No test for trip filter dropdown rendering and selection behavior (Iteration 4 gap). Combined into one task since both target the same test file.

**INTENTIONAL/COSMETIC items — no fix task needed (9 items):**

- `shared_trip_count` always 1 with `tripId` filter (Iteration 2) — intentional per architecture; when filtering by trip, count reflects the filter
- `NotAMutualError` message includes target userId (Iteration 3) — reviewer confirmed low risk, caller already knows the ID
- Inviter/trip lookups outside transaction (Iteration 3) — reviewer confirmed acceptable with fallback values
- Integration tests don't explicitly clean up (Iteration 3) — matches existing test patterns
- `phoneNumbers` destructuring relies on schema `.default([])` (Iteration 3) — correct, Fastify validates body through schema
- No server-side prefetch in mutuals page (Iteration 4) — acceptable given infinite query hydration complexity
- `mutualCount` shows loaded count, not server total (Iteration 4) — cursor pagination doesn't produce total count; would require extra COUNT query
- `useMemo` for page flattening (Iteration 4) — negligible performance impact, flatMapping <100 items is microseconds
- `"use client"` redundant in hook file (Iteration 4) — consistent with existing `use-trips.ts` pattern
- Auto-closing sheet on trip link navigation (Iteration 5) — non-issue, page unmounts on navigate
- AvatarImage conditional vs always-render (Iteration 6) — cosmetic inconsistency, both produce identical behavior
- Pre-existing `as any` lint warning in `verification.service.test.ts` — not part of mutuals feature

**ALREADY RESOLVED items (no action needed):**

- Redundant icon classes on Users icon in app-header (Iteration 5) — fixed during that iteration
- Keyboard accessibility on mutual cards (Iteration 4 suggestion) — implemented in Iteration 5
- Turbo runner flakiness (Iterations 1-4) — fixed in Iteration 5 via `turbo.json` `passThroughEnv`
- Member count not updating after mutual invite (Iteration 6) — found and fixed during that iteration

**No FAILURE or BLOCKED statuses exist** — all 6 iterations completed successfully.

### Verification results

- Shared tests: 231 passing (12 files)
- API tests: 1034 passing (48 files)
- Web tests: 1166 passing (65 files)
- E2E tests: 22 passing
- Total: 2431 unit/integration + 22 E2E = 2453 tests — all passing
- Lint: PASS (1 pre-existing warning in unrelated API test file)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment

- **APPROVED** — All genuinely actionable items identified and given fix tasks with accurate file paths and line numbers. ACTIONABLE vs COSMETIC/INTENTIONAL classification is sound. Fix tasks are well-specified with clear Fix/Test/Verify structure.
- One LOW severity note: Iteration 3's four reviewer notes and two Iteration 4 notes were not explicitly listed in the dismissed items enumeration, though they were all correctly excluded from fix tasks since the reviewer had explicitly marked each as acceptable/correct. Addressed by including them in the INTENTIONAL/COSMETIC list above.

### Learnings for future iterations

- Triage tasks should explicitly enumerate ALL dismissed reviewer notes, even when the reviewer marked them as acceptable — this creates a complete audit trail
- The turbo runner flakiness from Iterations 1-4 was definitively resolved in Iteration 5 via `passThroughEnv` in `turbo.json` — this is no longer an issue
- When triaging, items already resolved in a previous iteration (e.g., "FIXED post-review") should be noted as "ALREADY RESOLVED" to distinguish from items dismissed as cosmetic

## Iteration 8 — Task 5.2: Return 400 instead of 500 for malformed cursor

**Status**: ✅ COMPLETE

### What was done

**Modified files:**

- `apps/api/src/errors.ts` — Added `InvalidCursorError` export (line 71): `createError("INVALID_CURSOR", "%s", 400)`, following the exact `InvalidDateRangeError` pattern
- `apps/api/src/services/mutuals.service.ts` — Added `InvalidCursorError` to import (line 6), wrapped `decodeCursor` method (lines 80-88) in try/catch that catches any parsing error and throws `new InvalidCursorError("Invalid cursor format")`
- `apps/api/tests/unit/mutuals.service.test.ts` — Added `InvalidCursorError` to imports, added unit test "should throw InvalidCursorError for malformed cursor" verifying `getMutuals({ userId, cursor: "not-valid-base64!!!" })` rejects with `InvalidCursorError`
- `apps/api/tests/integration/mutuals.routes.test.ts` — Added integration test "should return 400 for malformed cursor" verifying `GET /api/mutuals?cursor=garbage` with valid auth returns HTTP 400

**No changes needed (correct by design):**

- `apps/api/src/controllers/mutuals.controller.ts` — Existing `if ("statusCode" in error) throw error` pattern already correctly re-throws `@fastify/error` instances to the global error handler
- `apps/api/src/middleware/error.middleware.ts` — Existing handler already correctly maps `@fastify/error` instances with `statusCode < 500` to proper HTTP responses

### Verification results

- Shared tests: 231 passing (12 files)
- API tests: 1036 passing (48 files), including 2 new tests (1 unit + 1 integration)
- Web tests: 1166 passing (cached)
- E2E tests: 22 passing
- Lint: PASS (0 new errors; 1 pre-existing warning in unrelated API test file)
- Typecheck: PASS (all 3 packages)

### Reviewer assessment

- **APPROVED** — Minimal, focused change with correct error propagation chain. Pattern consistency with existing `InvalidDateRangeError`. try/catch covers all failure modes (invalid base64 → garbage bytes → JSON parse fails; valid base64 → non-JSON string → JSON parse fails). Import style uses `.js` extension per project convention.
- Two LOW severity notes (both non-blocking):
  1. Could add additional test with valid-base64-but-invalid-JSON cursor to explicitly document both failure modes (current test already exercises the JSON parse throw path)
  2. Integration test could also assert error body shape (`{ code: "INVALID_CURSOR" }`) in addition to status code

### Design decisions

- Wrapped the entire `decodeCursor` method body in a single try/catch rather than catching at each call site — this is cleaner since `decodeCursor` is called from both `getMutuals` and `getMutualSuggestions`, fixing both paths with one change
- Used generic `catch` (not `catch (error)`) since we always want to throw `InvalidCursorError` regardless of the specific parsing failure type — this matches modern TypeScript catch handling
- The error message "Invalid cursor format" is generic and does not leak internal details (no base64/JSON implementation details exposed to the client)

### Learnings for future iterations

- `@fastify/error` instances automatically get a `statusCode` property, which the controller's duck-typing check `"statusCode" in error` uses to distinguish typed errors from unexpected errors — this means adding a new error class requires zero controller changes
- `Buffer.from(str, "base64")` does NOT throw on invalid base64 — it silently ignores invalid characters and produces garbage bytes. The failure always comes from `JSON.parse()` on the resulting garbage string
- For fix tasks from reviewer triage, the implementation is often very surgical (4 lines of production code + 2 test cases) — these are fast iterations
