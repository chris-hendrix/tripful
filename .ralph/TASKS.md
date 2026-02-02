# Phase 1: Project Setup & Infrastructure - Task List

## Task Execution Philosophy

- Tasks are consolidated into meaningful chunks for efficient implementation
- Tests are written WITH implementation (TDD approach), not as a separate phase
- Tasks are marked complete when implementation AND tests pass
- Follow the order for dependency flow (monorepo → shared → api → web → workflow → docs)

---

## 1. Monorepo Foundation & Configuration

- [x] **1.1 Initialize complete monorepo infrastructure**
  - Create `pnpm-workspace.yaml` with apps/\* and shared patterns
  - Create root `package.json` with workspace scripts (dev, build, lint, typecheck, test)
  - Install and configure Turbo with `turbo.json` (pipelines for all commands, caching)
  - Create `tsconfig.base.json` with strict mode (target: ES2023, module: nodenext)
  - Set up ESLint 9.x with flat config (`eslint.config.js`) and TypeScript rules
  - Create `.gitignore` (node_modules, .env, dist, .next, coverage)
  - Run `pnpm install` to verify workspace setup

**Acceptance Criteria**:

- ✅ `pnpm install` succeeds without errors
- ✅ `pnpm lint` runs without configuration errors
- ✅ `pnpm build` shows Turbo caching (empty build passes)
- ✅ Base TypeScript config is valid and strict mode enabled

**Test**: Workspace installs, linting configured, Turbo cache works

---

## 2. Shared Package with Types, Schemas & Utils

- [x] **2.1 Create complete shared package**
  - Create `shared/` directory structure: types/, schemas/, utils/
  - Create `shared/package.json` with proper exports and dependencies (zod, date-fns, date-fns-tz)
  - Create `shared/tsconfig.json` extending base config
  - Implement `shared/types/index.ts`:
    - Common types: `ApiResponse<T>`, `PaginatedResponse<T>`, `ErrorResponse`
  - Implement `shared/schemas/index.ts`:
    - Zod schemas: `phoneNumberSchema`, `emailSchema`, `uuidSchema`
  - Implement `shared/utils/index.ts`:
    - Timezone utilities: `convertToUTC`, `formatInTimeZone`
  - Write simple tests for schemas and utilities

**Acceptance Criteria**:

- ✅ `pnpm --filter @tripful/shared install` succeeds
- ✅ All exports are properly typed (no TS errors)
- ✅ Zod schemas validate correctly
- ✅ Utility functions work as expected
- ✅ Can import from other packages: `import { ApiResponse } from '@shared/types'`

**Test**: Shared package builds, imports work, validation passes

---

## 3. Backend (API) - Server, Database & Health Check

- [x] **3.1 Set up complete Fastify backend infrastructure**
  - Create `apps/api/` directory structure (src/config, routes, controllers, services, middleware, db/schema, types, tests/integration)
  - Create `apps/api/package.json` with scripts and dependencies:
    - Dependencies: fastify, drizzle-orm, pg, zod, dotenv
    - Fastify plugins: @fastify/cors, @fastify/jwt, @fastify/rate-limit
    - DevDependencies: vitest, @types/pg, tsx, typescript
  - Create `apps/api/tsconfig.json` extending base with path aliases (@/, @shared/\*)
  - Set up environment variable validation:
    - Create `src/config/env.ts` with Zod schema validation
    - Create `.env` and `.env.example` files
    - Required vars: DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL, LOG_LEVEL
  - Configure Drizzle ORM:
    - Create `drizzle.config.ts` with PostgreSQL configuration
    - Create `src/config/database.ts` with pg Pool, Drizzle instance, and `testConnection()` function
    - Create empty `src/db/schema/index.ts` (no tables in Phase 1)
  - Initialize Fastify server (`src/server.ts`):
    - Register CORS plugin (origin: FRONTEND_URL, credentials: true)
    - Register JWT plugin (secret: JWT_SECRET, expiresIn: 7d)
    - Register rate-limit plugin (max: 100, timeWindow: 15 min)
    - Add error handler middleware
    - Configure logger (level from env)

**Acceptance Criteria**:

- ✅ `pnpm --filter @tripful/api install` succeeds
- ✅ Server starts on port 8000 without errors
- ✅ Environment validation blocks startup with missing vars
- ✅ `testConnection()` returns true when PostgreSQL is running
- ✅ All Fastify plugins are registered correctly

**Test**: Server starts, env validation works, DB connection test passes

- [x] **3.2 Implement health check endpoint with full testing**
  - Create health check route (`src/routes/health.routes.ts`)
  - Create health check controller (`src/controllers/health.controller.ts`)
  - Create health check service (`src/services/health.service.ts`):
    - Return: { status, timestamp, database: 'connected'/'disconnected' }
  - Register health routes in server.ts at `/api/health`
  - Set up Vitest testing infrastructure:
    - Create `vitest.config.ts` with path aliases
    - Create `tests/setup.ts` for test environment (test DB connection)
    - Create `tests/helpers.ts` with Fastify app builder
  - Write integration tests:
    - `tests/integration/health.test.ts`: GET /api/health returns 200 with correct JSON
    - `tests/integration/database.test.ts`: testConnection() works, can query SELECT 1

**Acceptance Criteria**:

- ✅ GET http://localhost:8000/api/health returns 200
- ✅ Response: `{ "status": "ok", "timestamp": "...", "database": "connected" }`
- ✅ `pnpm --filter @tripful/api test` runs all tests
- ✅ All integration tests pass (2-4 tests)
- ✅ Tests verify both API response and database connectivity

**Test**: Health endpoint works, all integration tests pass

---

## 4. Frontend (Web) - Next.js with shadcn/ui

- [x] **4.1 Create complete Next.js frontend with UI components**
  - Create `apps/web/` directory
  - Initialize Next.js 16 with create-next-app:
    - TypeScript: Yes, App Router: Yes, Tailwind CSS: Yes, ESLint: Yes
  - Update `apps/web/package.json`:
    - Name: "@tripful/web"
    - Scripts: dev (port 3000), build, start, lint, typecheck
  - Create `apps/web/tsconfig.json` extending base with path aliases (@/, @shared/\*)
  - Configure Tailwind CSS 4:
    - Update `tailwind.config.ts` with content paths and custom config
    - Create `postcss.config.mjs` for Tailwind processing
    - Update `app/globals.css` with Tailwind directives and custom styles
  - Set up shadcn/ui:
    - Run `npx shadcn@latest init` with config (style: new-york, RSC: true, baseColor: slate)
    - Add basic components: `npx shadcn@latest add button input form`
    - Verify `components.json` has correct aliases and paths
  - Create basic App Router pages:
    - `app/layout.tsx`: Root layout with metadata and globals.css
    - `app/page.tsx`: Welcome page with "Welcome to Tripful" heading using Tailwind
  - Configure environment variables:
    - Create `.env.local` and `.env.local.example`
    - Set NEXT_PUBLIC_API_URL=http://localhost:8000/api

**Acceptance Criteria**:

- ✅ `pnpm --filter @tripful/web install` succeeds
- ✅ `pnpm --filter @tripful/web dev` starts server on port 3000
- ✅ Visit http://localhost:3000 shows welcome message styled with Tailwind
- ✅ shadcn/ui components exist in `components/ui/` (button.tsx, input.tsx, form.tsx)
- ✅ Can import and render Button component without errors
- ✅ `pnpm --filter @tripful/web lint` and `typecheck` pass
- ✅ Hot reload works when editing pages

**Test**: Frontend runs, shadcn/ui works, page renders correctly

---

## 5. Database & Development Workflow

- [x] **5.1 Set up Docker Compose and parallel dev servers**
  - Create `docker-compose.yml` in root:
    - PostgreSQL 16 service (image: postgres:16-alpine)
    - Container name: tripful-postgres
    - Ports: 5432:5432
    - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    - Volume: postgres_data for persistence
    - Healthcheck: pg_isready command
  - Verify database setup:
    - Run `docker compose up -d`
    - Test connection from API with health check endpoint
    - Ensure "database: connected" in response
  - Configure parallel dev servers in root package.json:
    - Update `dev` script to use Turbo for running both web and api dev
    - Ensure web runs on port 3000, api on port 8000
    - Test hot reload for both apps
  - Verify full integration:
    - Start both servers with `pnpm dev`
    - Test CORS by accessing API from frontend origin
    - Confirm no CORS errors in browser console

**Acceptance Criteria**:

- ✅ `docker compose up -d` starts PostgreSQL successfully
- ✅ Database is healthy (pg_isready passes)
- ✅ API connects to database (health check shows "connected")
- ✅ `pnpm dev` starts both web (3000) and api (8000) in parallel
- ✅ Hot reload works for both apps
- ✅ CORS allows frontend to call backend API

**Test**: Database runs, both servers start together, full stack works

---

## 6. Code Quality & Git Hooks

- [x] **6.1 Set up Husky, lint-staged, and Prettier**
  - Install Husky and lint-staged as dev dependencies
  - Run `npx husky init` to create `.husky/` directory
  - Create `.husky/pre-commit` hook that runs lint-staged
  - Configure lint-staged in root package.json:
    - `*.{ts,tsx}`: Run ESLint with --fix, Prettier with --write
    - `*.{json,md}`: Run Prettier with --write
  - Add `prepare` script to root package.json (for Husky install)
  - Install Prettier and create `.prettierrc` with formatting rules
  - Add `format` script to root package.json
  - Test pre-commit hook:
    - Create file with linting errors
    - Attempt commit → should be blocked
    - Fix errors and commit → should succeed

**Acceptance Criteria**:

- ✅ Git pre-commit hook runs automatically
- ✅ Hook blocks commits with linting errors
- ✅ Hook allows commits with valid code
- ✅ ESLint and Prettier run on staged files only
- ✅ `pnpm format` formats all code consistently

**Test**: Pre-commit hook enforces code quality

---

## 7. Full Workflow Verification & Documentation

- [ ] **7.1 Test complete monorepo workflow**
  - From clean state, run full workflow:
    - `pnpm install` (all packages)
    - `docker compose up -d` (database)
    - `pnpm dev` (both servers)
    - `pnpm test` (all tests pass)
    - `pnpm lint` (no errors)
    - `pnpm typecheck` (no errors)
    - `pnpm build` (both apps build)
  - Verify Turbo caching:
    - First build compiles everything
    - Second build shows cache hits (FULL TURBO)
  - Test cross-package imports:
    - Import from @shared/types in backend
    - Import from @shared/schemas in frontend
    - Verify no TypeScript errors

**Acceptance Criteria**:

- ✅ All workspace commands work without errors
- ✅ Turbo caching works (second build faster)
- ✅ All tests pass (backend integration tests)
- ✅ Linting and type checking pass for all packages
- ✅ Both apps build successfully
- ✅ Shared package imports resolve correctly

**Test**: Complete workflow from install to build succeeds

- [ ] **7.2 Write comprehensive documentation**
  - Create root `README.md` with complete sections:
    - **Project Overview**: What Tripful is and Phase 1 scope
    - **Prerequisites**: Node 22, pnpm, Docker (with version checks)
    - **Installation**: Step-by-step setup instructions
    - **Running Development**: How to start servers, access URLs
    - **Project Structure**: Directory layout and purpose of each folder
    - **Available Scripts**: All pnpm commands and what they do
    - **Environment Variables**: Required vars for each app
    - **Testing**: How to run tests and what's tested
    - **Troubleshooting**: Common issues and solutions
  - Verify .env.example files are complete:
    - `apps/api/.env.example`: All backend vars with comments
    - `apps/web/.env.local.example`: All frontend vars with comments
  - Create quick reference section in README:
    - Common commands cheatsheet
    - Port assignments (3000, 8000, 5432)
    - Links to architecture docs

**Acceptance Criteria**:

- ✅ README is comprehensive (1000+ words)
- ✅ Can follow README from scratch to working system
- ✅ All environment variables are documented
- ✅ .env.example files exist and are complete
- ✅ Troubleshooting section covers common issues

**Test**: New developer can set up project using only README

---

## Task Summary

**Total consolidated tasks**: 10

**By category**:

1. Monorepo Foundation & Configuration: 1 task
2. Shared Package: 1 task
3. Backend (API): 2 tasks
4. Frontend (Web): 1 task
5. Database & Workflow: 1 task
6. Code Quality: 1 task
7. Verification & Documentation: 2 tasks

**Estimated effort**: 4-6 hours for experienced developer

---

## Completion Criteria

Phase 1 is complete when:

- [ ] All 10 tasks are checked off
- [ ] `pnpm dev` starts both servers without errors (web:3000, api:8000)
- [ ] `pnpm test` runs and passes all integration tests
- [ ] `pnpm lint` and `pnpm typecheck` pass for all packages
- [ ] `pnpm build` builds both apps successfully with Turbo caching
- [ ] GET http://localhost:8000/api/health returns 200 with database: "connected"
- [ ] Visit http://localhost:3000 shows welcome page with working styles
- [ ] Git pre-commit hooks enforce code quality
- [ ] README documents complete setup with all commands
- [ ] All .env.example files exist and are documented
- [ ] Docker Compose runs PostgreSQL successfully
- [ ] Cross-package imports work (shared → api, shared → web)

---

## Next Steps (Phase 2)

After Phase 1 completion:

- Implement phone authentication flow
- Create database schema and migrations (users, verification_codes tables)
- Set up TanStack Query in frontend
- Build login and verification UI pages
- Implement JWT authentication middleware and protected routes
