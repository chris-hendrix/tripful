# Verification: Skill Audit Remediation

## Environment Setup

### Devcontainer (required)

All pnpm/node/npx commands MUST run inside the devcontainer using the Makefile wrapper:

```bash
make test-exec CMD="<command>"
```

File operations (Read, Write, Edit, Glob, Grep) and git commands run directly on the host — the workspace is mounted in the container.

### Container Lifecycle

```bash
make test-up        # Start container + auto-setup (deps, migrations, env)
make test-status    # Check if container is running
make test-down      # Tear down when done
```

### Prerequisites

- Devcontainer is running (verify with `make test-status`)
- If not running: `make test-up` from the workspace root

### After Adding New Packages

When new npm packages are added (e.g., `@fastify/swagger`, `@fastify/swagger-ui`):

```bash
make test-exec CMD="pnpm install"
```

### After Schema Changes / New Migrations

When database schema changes are made:

```bash
# Generate migration from schema changes
make test-exec CMD="cd apps/api && pnpm db:generate"

# Apply migration
make test-exec CMD="cd apps/api && pnpm db:migrate"
```

## Test Commands

### Unit / integration tests (primary verification)

```bash
make test-exec CMD="pnpm test"
```

### E2E tests

```bash
make test-exec CMD="pnpm test:e2e"
```

### E2E specific project (cross-browser)

```bash
# Run E2E on specific browser project
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --project=chromium"
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --project=firefox"
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --project=webkit"
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --project=iphone"
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --project=ipad"
```

### Linting

```bash
make test-exec CMD="pnpm lint"
```

### Type checking

```bash
make test-exec CMD="pnpm typecheck"
```

### Shared package build

```bash
make test-exec CMD="pnpm --filter @tripful/shared build"
```

### Run specific test file

```bash
# API tests
make test-exec CMD="pnpm --filter @tripful/api test -- src/services/__tests__/<file>"

# Web component tests
make test-exec CMD="pnpm --filter @tripful/web test -- src/components/<path>/<file>"

# Shared package tests
make test-exec CMD="pnpm --filter @tripful/shared test -- __tests__/<file>"
```

### List E2E tests

```bash
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --list"
```

### Install Playwright browsers (after adding Firefox/WebKit)

```bash
make test-exec CMD="pnpm --filter @tripful/web exec playwright install firefox webkit"
```

## Manual Testing (Playwright CLI)

Start dev servers inside the container, then use CLI commands to interact:

```bash
# Start dev servers (background)
make test-exec CMD="bash -c 'pnpm --filter @tripful/api dev & pnpm --filter @tripful/web dev & wait'"

# CLI shorthand
PW_CLI="playwright-cli --config .devcontainer/playwright-cli.config.json"

# Navigate and interact
make test-exec CMD="$PW_CLI open http://localhost:3000"
make test-exec CMD="$PW_CLI snapshot"
make test-exec CMD="$PW_CLI click e5"
make test-exec CMD="$PW_CLI fill e1 'user@example.com'"
make test-exec CMD="$PW_CLI screenshot"

# Save/restore auth state
make test-exec CMD="$PW_CLI state-save auth.json"
make test-exec CMD="$PW_CLI state-load auth.json"
```

Screenshots saved to `.playwright-cli/` and viewable with the Read tool.

## Ports and URLs

| Service       | Container Port | Notes                                    |
| ------------- | -------------- | ---------------------------------------- |
| Web (Next.js) | 3000           | `http://localhost:3000` inside container |
| API (Fastify) | 8000           | `http://localhost:8000` inside container |
| API Docs      | 8000           | `http://localhost:8000/docs` (after OpenAPI task) |
| PostgreSQL    | 5432           | Internal only                            |

Host ports vary — use `make test-status` to see assigned ports.

## Test Credentials

E2E tests use auto-generated phone numbers via `generateUniquePhone()` with test bypass code `123456`. No manual credentials needed.

For manual testing:

- Create users via the auth flow (phone + verification code `123456` in test mode)
- Create trips and invite members to establish mutual relationships
- Use `pnpm --filter @tripful/api db:seed` for seed data if available

## Feature Flags

None — no feature flags are used for this work.

## New Dependencies (to be installed)

| Package | Workspace | Purpose |
|---------|-----------|---------|
| `@fastify/swagger` | `apps/api` | OpenAPI spec generation |
| `@fastify/swagger-ui` | `apps/api` | Swagger UI at `/docs` |

## Verification Milestones

| After Task | Expected State |
| ---------- | -------------- |
| 1.1 | New tables created, migration applied, schema compiles |
| 1.2 | Rate limiting works with PG store, cleanup job registered |
| 1.3 | Token blacklist on logout, 401 on blacklisted token |
| 1.4 | Account locks after 5 failures, resets on success |
| 2.1 | pg-boss queues have expiration + DLQ, DLQ workers log errors |
| 2.2 | Query logging visible at debug level, slow query warnings |
| 2.3 | All routes have response schemas, `/docs` serves OpenAPI UI |
| 2.4 | No bare select() calls, all services use column selection |
| 3.1 | Backend cursor pagination working for trips, notifications, messages |
| 3.2 | Frontend infinite scroll with cursors, placeholderData prevents flash |
| 4.1 | enabled at call sites, global mutation indicator, error boundary reset |
| 4.2 | No useEffect dep warnings, endDate auto-fill works, parallel fetching |
| 5.1 | Theme tokens everywhere, WCAG AA contrast passing, Button in ErrorBoundary |
| 5.2 | Loading skeletons for mutuals + auth, timezone list expanded |
| 6.1 | Space Grotesk rendering correctly across key pages |
| 6.2 | Scroll animations, staggered reveals, page transitions working |
| 6.3 | Gradient mesh backgrounds, asymmetric grid, card hover effects |
| 7.1 | Dialogs → bottom-sheets on mobile, Dialog on desktop |
| 7.2 | Hamburger menu on mobile, hover guards on touch devices |
| 8.1 | E2E tests pass across Chromium, Firefox, WebKit, iPhone, iPad |
| 8.2 | Zero inline timeout numbers in E2E tests |
| 9.1 | All PROGRESS.md issues triaged and fixed |
| 10.1 | All checks green: lint, typecheck, unit, integration, E2E (all browsers) |
