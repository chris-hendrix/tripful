# Tripful

A collaborative trip planning platform enabling groups to organize travel together.

## What (Technology Stack)

**Monorepo Structure** (pnpm + Turbo):

- `apps/api` - Fastify REST API with PostgreSQL (Drizzle ORM)
- `apps/web` - Next.js 16 App Router frontend with React 19
- `shared` - Shared types, Zod schemas, and utilities

**Key Technologies**:

- **Backend**: Fastify 5, Drizzle ORM, PostgreSQL 16, JWT auth
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, TanStack Query
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Validation**: Zod schemas (shared across frontend/backend)
- **DevOps**: Docker Compose (PostgreSQL), Husky + lint-staged, GitGuardian

## Why (Project Purpose)

Tripful helps groups plan trips together by coordinating:

- Group travel itineraries and accommodations
- Event scheduling with RSVP tracking
- Member availability and travel logistics

**Current Status**: Phase 6 (Advanced Itinerary) complete. See `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md` for implementation progress.

## How (Development Workflow)

### Package Manager

Use **pnpm** (required for workspace features). Never use `npm` or `yarn`.

### Common Commands

```bash
# Setup
pnpm install
pnpm docker:up        # Start PostgreSQL

# Development
pnpm dev              # Both servers (web:3000, api:8000)
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Quality Checks
pnpm lint             # ESLint check
pnpm format           # Prettier format
pnpm typecheck        # TypeScript validation
pnpm test             # All tests
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright E2E tests with UI (port 9323)

# Database (run from apps/api)
cd apps/api
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:studio        # Visual database browser (Drizzle Studio)
```

### Environment Setup

Copy example files and configure:

- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.local.example` → `apps/web/.env.local`

Required: `DATABASE_URL` and `JWT_SECRET` (minimum 32 characters).

### Code Quality Standards

- **TypeScript**: Strict mode enabled across all packages
- **Formatting**: Prettier runs automatically via pre-commit hooks
- **Linting**: ESLint with TypeScript plugin (auto-fix available)
- **Pre-commit**: GitGuardian scans for secrets (requires Docker running)

### Testing Requirements

- **Unit tests** for new services/utilities (Vitest)
- **Integration tests** for API endpoints (Vitest)
- **E2E tests** for user flows (Playwright)
- Tests must pass before merging (`pnpm test`)

### Shared Code Pattern

Place code shared between web/api in `shared/`:

- **Types**: `shared/types/` (interfaces, type definitions)
- **Schemas**: `shared/schemas/` (Zod validation schemas)
- **Utils**: `shared/utils/` (pure functions)

Always export through barrel files (`index.ts`).

**Importing from shared package:**

- ✅ Use workspace package: `import { ... } from '@tripful/shared/schemas'`
- ❌ Never use relative paths: `import { ... } from '../../../../shared/schemas/index.js'`
- Available exports: `@tripful/shared`, `@tripful/shared/types`, `@tripful/shared/schemas`, `@tripful/shared/utils`

### Database Changes

1. Update schema in `apps/api/src/db/schema/`
2. Generate migration: `cd apps/api && pnpm db:generate`
3. Review generated SQL in `apps/api/src/db/migrations/`
4. Apply migration: `pnpm db:migrate`

### Documentation

- **API Architecture**: See `docs/2026-02-01-tripful-mvp/ARCHITECTURE.md`
- **Setup Guide**: See `README.md` and `DEVELOPMENT.md`
- **Test Scripts**: See `scripts/README.md` for verification utilities

### Port Assignments

- Frontend: `3000` (Next.js dev server)
- Backend: `8000` (Fastify API)
- PostgreSQL: `5433` (external) → `5432` (container)
- Playwright UI: `9323` (when using `pnpm test:e2e:ui`)

### Troubleshooting

- **Database connection issues**: Verify PostgreSQL is running (`pnpm docker:up`)
- **Hot reload not working**: Check file watchers limit (Linux: `sysctl fs.inotify.max_user_watches`)
- **Pre-commit hook fails**: Ensure Docker is running (GitGuardian uses Docker)
- **Type errors in shared package**: Run `pnpm build` in `shared/` first
