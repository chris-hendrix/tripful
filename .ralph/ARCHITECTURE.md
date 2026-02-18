# Rebase and Fix All Dependabot PRs - Architecture

Consolidate 3 open Dependabot PRs (#20, #22, #23) into a single branch. Apply all dependency upgrades, fix all breaking changes, run full local verification, then close the original PRs as superseded.

## Overview

Three Dependabot PRs cover CI config, dev dependencies, and production dependencies. Rather than fixing each branch separately, we apply all upgrades on one branch, fix breaking changes holistically, and create a single PR that supersedes all three.

## Dependency Upgrades

### CI Config (from PR #20)

- `.github/workflows/ci.yml`: `actions/cache@v4` → `actions/cache@v5` (2 occurrences)

### Dev Dependencies (from PR #23)

| Package | From | To | Workspace | Notes |
|---------|------|----|-----------|-------|
| `eslint` | ^9 | ^10 | root | New `preserve-caught-error` rule |
| `@eslint/js` | ^9 | ^10 | root | Paired with ESLint |
| `vitest` | ^2/^3/^4 | ^4 | web, shared, api | Major bump across all workspaces |
| `jsdom` | ^25 | ^28 | web | Test environment |
| `@vitejs/plugin-react` | ^4 | ^5 | web | Vite plugin |
| `@types/node` | ^22 | ^25 | root | Type definitions |
| `globals` | ^15 | ^17 | root | ESLint globals |
| `lint-staged` | ^15 | ^16 | root | Pre-commit hooks |
| `drizzle-kit` | ^0.28 | ^0.31 | api | Migration tooling |
| `turbo` | ^2.3 | ^2.8 | root | Build system |

### Production Dependencies (from PR #22)

| Package | From | To | Workspace | Risk | Files Affected |
|---------|------|----|-----------|------|----------------|
| `zod` | ^3.24 | ^4 | shared, api, web | **HIGH** | 30 files |
| `fastify-type-provider-zod` | ^4 | ^6 | api | **HIGH** | 2 files |
| `@fastify/cors` | ^10 | ^11 | api | Medium | 1 file |
| `@fastify/jwt` | ^9 | ^10 | api | Medium | auth middleware |
| `drizzle-orm` | ^0.36 | ^0.45 | api | Medium | schema + queries |
| `@hookform/resolvers` | ^3 | ^5 | web | Medium | 13 form components |
| `tailwind-merge` | ^2 | ^3 | web | Low | 1 file |
| `dotenv` | ^16 | ^17 | api | Low | env loading |

## Technical Approach

### 1. Package Version Bumps

Update version ranges in all `package.json` files, then run `pnpm install` to regenerate the lockfile.

**Files to edit:**
- `/package.json` — eslint, @eslint/js, @types/node, globals, lint-staged, turbo
- `/apps/api/package.json` — zod, fastify-type-provider-zod, @fastify/cors, @fastify/jwt, drizzle-orm, dotenv, drizzle-kit, vitest
- `/apps/web/package.json` — zod, @hookform/resolvers, tailwind-merge, vitest, jsdom, @vitejs/plugin-react
- `/shared/package.json` — zod, vitest

### 2. CI Config

**File**: `.github/workflows/ci.yml`
- Replace `actions/cache@v4` with `actions/cache@v5` (2 occurrences)

### 3. Zod 3 → 4 Migration (Highest Risk)

The researcher agent must fetch the Zod 4 migration guide to identify exact breaking changes before making modifications.

**Files by layer:**
- **Shared schemas** (12 files in `shared/schemas/`): `accommodation.ts`, `auth.ts`, `event.ts`, `index.ts`, `invitation.ts`, `member-travel.ts`, `member.ts`, `message.ts`, `notification.ts`, `phone.ts`, `trip.ts`, `user.ts`
- **API env** (`apps/api/src/config/env.ts`): Known TS2769 errors from `.transform()`, `.refine()`, `.default()` chaining changes
- **API routes** (10 files in `apps/api/src/routes/`): `accommodation.routes.ts`, `event.routes.ts`, `health.routes.ts`, `invitation.routes.ts`, `member-travel.routes.ts`, `message.routes.ts`, `notification.routes.ts`, `trip.routes.ts`, `user.routes.ts`
- **Web forms** (13 files): Login, verify, complete-profile pages + all itinerary/trip/profile dialog components

**Common Zod 4 breaking changes to investigate:**
- Schema API changes (`.object()`, `.enum()`, `.transform()`, `.refine()`, `.default()` chaining)
- `z.infer` type inference behavior
- `ZodError` structure changes
- `z.coerce` behavior changes (used in env.ts)

### 4. Fastify Ecosystem

**fastify-type-provider-zod v4 → v6:**
- **File**: `apps/api/src/app.ts` — `validatorCompiler`, `serializerCompiler` exports
- **File**: `apps/api/src/middleware/error.middleware.ts` — `hasZodFastifySchemaValidationErrors`
- **Critical investigation**: Unit tests show routes returning 400 (validation error) instead of expected 401/403/404. Must investigate whether this is from Zod 4 schema changes, fastify-type-provider-zod v6 behavior, or both.

**@fastify/cors v10 → v11:**
- Check for config option changes in `apps/api/src/app.ts`

**@fastify/jwt v9 → v10:**
- Check for API changes in auth middleware and plugin registration

### 5. ESLint 9 → 10

**File**: `eslint.config.js` (flat config, already ESLint 9 format)
- New `preserve-caught-error` rule causes 2 errors in API code
- Fix: Add `{ cause: error }` to re-thrown errors
- Locate errors with `pnpm lint` after version bump

### 6. Frontend Package Updates

**@hookform/resolvers v3 → v5:**
- All 13 files use: `import { zodResolver } from "@hookform/resolvers/zod"`
- Check if import path or resolver function signature changed
- Must be compatible with Zod 4

**tailwind-merge v2 → v3:**
- Single usage in `apps/web/src/lib/utils.ts` — `twMerge()` function
- Check if API changed

### 7. Other Updates

**drizzle-orm v0.36 → v0.45 + drizzle-kit v0.28 → v0.31:**
- Schema in `apps/api/src/db/schema/index.ts` (549 lines) and `relations.ts` (161 lines)
- Verify schema API compatibility, migration generation still works

**vitest v2/v3 → v4:**
- Config files in each workspace
- Check for breaking config changes

**dotenv v16 → v17:**
- Used in `apps/api/src/config/env.ts` — `config({ path: [...] })` call

## Testing Strategy

Full local verification after each phase:

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Unit + integration (Vitest)
pnpm test:e2e      # Playwright E2E
```

**Requires**: Docker + PostgreSQL running (`pnpm docker:up`), dev servers running for E2E.

**Key test focus areas:**
- API route tests — the 400 vs 401/403/404 status code issue
- Shared schema compilation — `z.infer` types still resolve
- Form validation — zodResolver works with Zod 4 schemas
- E2E — no regressions in user flows

## PR Strategy

1. All changes on Ralph branch (`ralph/20260217-2129-rebase-dependabot-prs`)
2. Create PR from Ralph branch → main
3. Close Dependabot PRs #20, #22, #23 with comment linking to our consolidated PR
