# Verification: Mutuals Invite

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
make test-exec CMD="pnpm --filter @tripful/api test -- src/services/__tests__/mutuals.service.test.ts"
make test-exec CMD="pnpm --filter @tripful/web test -- src/hooks/__tests__/use-mutuals.test.ts"
```

### List E2E tests

```bash
make test-exec CMD="pnpm --filter @tripful/web exec playwright test --list"
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
- Create trips and invite members to establish mutual relationships

## Feature Flags

None — this feature has no feature flags.

## Seed Data

For manual testing of mutuals, you need at least 2 users who share a trip:

1. Create User A, create a trip
2. Create User B, invite them to the trip via phone number
3. User B accepts (RSVP as "going")
4. Now User A and User B are mutuals

The database seed script (`pnpm --filter @tripful/api db:seed`) may create test data with mutual relationships. Check `apps/api/src/db/seed.ts` for available seed data.

## Verification Milestones

| After Task | Expected State                                                                              |
| ---------- | ------------------------------------------------------------------------------------------- |
| 1.1        | Shared types/schemas build, schema unit tests pass, lint + typecheck pass                   |
| 2.1        | Mutuals API endpoints work, unit + integration tests pass                                   |
| 2.2        | Extended invitations accept userIds, notifications created, unit + integration tests pass   |
| 3.1        | Mutuals page renders, query hooks work, component tests pass                                |
| 3.2        | Profile sheet works, app header has "My Mutuals" link, component tests pass                 |
| 4.1        | Invite dialog has mutuals section, E2E tests pass, manual testing verified with screenshots |
| 5.1        | All cleanup items addressed                                                                 |
| 6.1        | All checks green: lint, typecheck, unit, E2E                                                |
