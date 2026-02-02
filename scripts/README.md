# Development Scripts

This directory contains scripts for testing and verifying the Tripful development environment.

## Available Scripts

### test-acceptance-criteria.sh

Tests all acceptance criteria from Task 5.1 in TASKS.md.

```bash
./scripts/test-acceptance-criteria.sh
```

Verifies:

1. Docker Compose starts PostgreSQL successfully
2. Database is healthy (pg_isready passes)
3. API connects to database (health check shows "connected")
4. `pnpm dev` starts both web (3000) and api (8000) in parallel
5. Hot reload is configured for both apps
6. CORS allows frontend to call backend API

### test-docker-compose.sh

Unit tests for the Docker Compose configuration.

```bash
./scripts/test-docker-compose.sh
```

Tests:

- docker-compose.yml file exists
- No obsolete 'version' field
- Valid YAML syntax
- PostgreSQL service is defined with correct image
- Container name is set correctly
- Environment variables are configured
- Port mapping is correct (5433:5432)
- Persistent volume is defined
- Health check is configured with correct user

### verify-dev-setup.sh

Comprehensive integration test that verifies the complete development setup.

```bash
./scripts/verify-dev-setup.sh
```

Tests:

1. Docker Compose configuration validity
2. PostgreSQL container health
3. Database readiness (pg_isready)
4. Database connection
5. Environment files exist (.env, .env.local)
6. Turbo.json persistent tasks configuration
7. Docker convenience scripts in package.json
8. Parallel dev servers start correctly
9. API health endpoint responds
10. CORS headers are configured

**Note:** This script will start and stop the dev servers. Ensure no other processes are using ports 3000 and 8000.

### test-hot-reload.sh

Displays hot reload configuration status and manual testing instructions.

```bash
./scripts/test-hot-reload.sh
```

Verifies:

- Turbo.json persistent dev tasks
- API tsx watch mode
- Web Next.js dev mode

## Usage in CI/CD

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions usage
- name: Test Docker Compose Config
  run: ./scripts/test-docker-compose.sh

- name: Verify Dev Setup
  run: ./scripts/verify-dev-setup.sh
```

## Quick Start

To verify your complete development environment:

```bash
# 1. Test Docker Compose configuration
./scripts/test-docker-compose.sh

# 2. Run full integration tests
./scripts/verify-dev-setup.sh

# 3. Check hot reload configuration
./scripts/test-hot-reload.sh
```

## Requirements

- Docker and Docker Compose v2+
- Node.js 22+
- pnpm 10+
- curl
- netcat (nc)
