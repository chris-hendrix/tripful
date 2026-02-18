# Rebase and Fix All Dependabot PRs - Tasks

## Phase 1: Version Bumps & CI Config

- [x] Task 1.1: Bump all dependency versions and update CI config
  - Implement: Update `.github/workflows/ci.yml` — replace `actions/cache@v4` with `actions/cache@v5` (2 occurrences)
  - Implement: Update `/package.json` — bump eslint, @eslint/js, @types/node, globals, lint-staged, turbo to target versions
  - Implement: Update `/apps/api/package.json` — bump zod, fastify-type-provider-zod, @fastify/cors, @fastify/jwt, drizzle-orm, dotenv, drizzle-kit, vitest
  - Implement: Update `/apps/web/package.json` — bump zod, @hookform/resolvers, tailwind-merge, vitest, jsdom, @vitejs/plugin-react
  - Implement: Update `/shared/package.json` — bump zod, vitest
  - Implement: Run `pnpm install` to regenerate lockfile
  - Verify: All package.json files have correct versions, lockfile regenerated cleanly

## Phase 2: Zod 4 Migration & Fastify Ecosystem

- [x] Task 2.1: Research Zod 4 breaking changes and migrate shared schemas
  - Research: Fetch Zod 4 migration guide, identify all breaking changes relevant to this codebase
  - Research: Check fastify-type-provider-zod v6 changelog for breaking changes
  - Research: Check @hookform/resolvers v5 changelog for breaking changes
  - Implement: Migrate all 12 shared schema files in `shared/schemas/` to Zod 4 API
  - Implement: Update `shared/schemas/index.ts` barrel exports if needed
  - Verify: `pnpm typecheck` passes for shared package

- [x] Task 2.2: Fix API layer — env.ts, routes, fastify-type-provider-zod, and Fastify plugins
  - Implement: Fix `apps/api/src/config/env.ts` Zod 4 TS2769 errors (`.transform()`, `.refine()`, `.default()`, `.coerce` changes)
  - Implement: Update `apps/api/src/app.ts` for fastify-type-provider-zod v6 (validatorCompiler, serializerCompiler)
  - Implement: Update `apps/api/src/middleware/error.middleware.ts` for v6 (hasZodFastifySchemaValidationErrors)
  - Implement: Fix @fastify/cors v11 and @fastify/jwt v10 breaking changes if any
  - Implement: Update API route files if Zod 4 schema usage changed
  - Implement: Investigate and fix the 400 vs 401/403/404 unit test failures — determine root cause (Zod 4 validation behavior, fastify-type-provider-zod v6 error handling, or both) and fix
  - Verify: `pnpm typecheck` passes for API package
  - Verify: `pnpm test` — all API unit/integration tests pass

- [x] Task 2.3: Fix frontend — @hookform/resolvers, tailwind-merge, and form components
  - Implement: Update `apps/web/src/lib/utils.ts` for tailwind-merge v3 if API changed
  - Implement: Update zodResolver usage in all 13 form components for @hookform/resolvers v5 + Zod 4 compatibility
  - Implement: Fix any Zod 4-related type errors in web form components (z.infer usage)
  - Verify: `pnpm typecheck` passes for web package
  - Verify: `pnpm test` — all frontend unit tests pass

## Phase 3: ESLint & Remaining Dev Dependencies

- [x] Task 3.1: Fix ESLint 10 errors and verify dev dependency upgrades
  - Implement: Fix 2 `preserve-caught-error` lint errors in API code — add `{ cause: error }` to re-thrown errors
  - Implement: Update `eslint.config.js` if needed for ESLint 10 compatibility
  - Implement: Verify vitest v4 config compatibility across all workspaces
  - Implement: Verify drizzle-kit v0.31 works with `pnpm db:generate` (dry run)
  - Verify: `pnpm lint` passes
  - Verify: `pnpm typecheck` passes (all packages)
  - Verify: `pnpm test` passes (all packages)

## Phase 4: Final Verification & PR Cleanup

- [ ] Task 4.1: Full regression check and close Dependabot PRs
  - Verify: `pnpm lint` — all packages pass
  - Verify: `pnpm typecheck` — all packages pass
  - Verify: `pnpm test` — all unit/integration tests pass
  - Verify: `pnpm test:e2e` — all E2E tests pass
  - Implement: Close Dependabot PRs #20, #22, #23 with comment linking to consolidated PR
