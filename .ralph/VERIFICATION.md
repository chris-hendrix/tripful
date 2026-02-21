# Verification: E2E Test Simplification

## Environment Setup

### Devcontainer (required)

All pnpm/node/npx commands MUST run inside the devcontainer using the Makefile wrapper:

```bash
make dev-exec CMD="<command>"
```

File operations (Read, Write, Edit, Glob, Grep) and git commands run directly on the host — the worktree is mounted in the container.

### Examples

```bash
# Run E2E tests
make dev-exec CMD="pnpm test:e2e"

# Run linting
make dev-exec CMD="pnpm lint"

# Run typecheck
make dev-exec CMD="pnpm typecheck"

# Run unit tests
make dev-exec CMD="pnpm test"

# List E2E tests
make dev-exec CMD="pnpm --filter @tripful/web exec playwright test --list"
```

### Prerequisites

- Devcontainer is running (verify with `make dev-list`)
- If not running: `make dev-up` from the worktree root

## Test Commands

### Full E2E suite (primary verification)

```bash
make dev-exec CMD="pnpm test:e2e"
```

Expected: 21 tests pass across 7 spec files after all tasks complete.

### Smoke E2E subset

```bash
make dev-exec CMD="pnpm test:e2e:smoke"
```

Expected: 6 tests pass (after Phase 2).

### Unit / integration tests

```bash
make dev-exec CMD="pnpm test"
```

Should remain unchanged — this task doesn't modify unit tests.

### Linting

```bash
make dev-exec CMD="pnpm lint"
```

### Type checking

```bash
make dev-exec CMD="pnpm typecheck"
```

### List E2E tests without running

```bash
make dev-exec CMD="pnpm --filter @tripful/web exec playwright test --list"
```

Useful for verifying test count and tag assignments.

## Ports and URLs

| Service | Container Port | Host Port |
|---------|---------------|-----------|
| Web (Next.js) | 3000 | Check `make dev-list` |
| API (Fastify) | 8000 | Check `make dev-list` |
| PostgreSQL | 5432 | Internal only |

## Test Credentials

E2E tests use auto-generated phone numbers via `generateUniquePhone()` with test bypass code `123456`. No manual credentials needed.

## Feature Flags

None — this task modifies test infrastructure only, no feature flags involved.

## Verification Milestones

| After Task | Expected State |
|-----------|---------------|
| 1.1 | 23 tests pass (9 removed) |
| 1.2 | 21 tests pass (merges done) |
| 2.1 | 21 tests pass, 6 smoke tests identified, `inviteAndAcceptViaAPI` accepts optional cookie |
| 3.1 | CI YAML updated with smoke job + sharding + report merge |
| 4.1 | All checks green: lint, typecheck, unit, E2E full (21), E2E smoke (6) |
