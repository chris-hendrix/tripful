# Verification: Trip Themes

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

# Web unit tests
make test-exec CMD="pnpm --filter @tripful/web test -- src/lib/__tests__/<file>"

# Shared package tests
make test-exec CMD="pnpm --filter @tripful/shared test -- __tests__/<file>"
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
| PostgreSQL    | 5432           | Internal only                            |

Host ports vary — use `make test-status` to see assigned ports.

## Test Credentials

E2E tests use auto-generated phone numbers via `generateUniquePhone()` with test bypass code `123456`. No manual credentials needed.

For manual testing:

- Create users via the auth flow (phone + verification code `123456` in test mode)
- Create trips to test theme application

## Feature Flags

None — no feature flags are used for this work.

## Verification Milestones

| After Task | Expected State |
| ---------- | -------------- |
| 1.1 | Theme columns created, migration applied, API accepts/returns theme fields, integration tests pass |
| 2.1 | color-utils with full test coverage, 4 new fonts loading, font mapping config ready |
| 3.1 | 20 templates defined, keyword detection working, all picker components rendering |
| 4.1 | Auto-detect on creation Next, Step 2 theme preview/change, E2E passes, screenshots |
| 5.1 | Hero renders all 4 states correctly, accent overrides work, E2E + screenshots |
| 6.1 | Theme editable in edit dialog, changes persist, E2E passes |
| 7.1 | All PROGRESS.md issues triaged and fixed |
| 8.1 | All checks green: lint, typecheck, unit, integration, E2E |
