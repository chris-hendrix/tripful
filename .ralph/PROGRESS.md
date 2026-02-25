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
