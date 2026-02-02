# Phase 1: Project Setup & Infrastructure - Verification Guide

## Overview

This document describes how to verify that Phase 1 has been implemented correctly. All verification steps should pass before considering Phase 1 complete.

## Prerequisites Check

Before running verification, ensure the following are installed:

```bash
# Check Node.js version (should be 22.x)
node --version

# Check pnpm version (should be 9.x or later)
pnpm --version

# Check Docker version (should be 24.x or later)
docker --version

# Check Docker Compose version
docker compose version
```

**Expected**: All commands return version numbers without errors.

---

## Environment Setup

### 1. Install Dependencies

```bash
# From root directory
pnpm install
```

**Expected**:

- All packages install without errors
- No peer dependency warnings
- Lock file is up to date

### 2. Start Infrastructure

```bash
# Start PostgreSQL
docker compose up -d

# Verify PostgreSQL is running
docker ps | grep tripful-postgres
```

**Expected**:

- Container starts successfully
- Health check shows "healthy" status after ~10 seconds

### 3. Check Database Connectivity

```bash
# Connect to database using psql (optional)
docker exec -it tripful-postgres psql -U tripful -d tripful

# Inside psql, run:
SELECT 1;
\q

# Or use pg_isready
docker exec tripful-postgres pg_isready -U tripful
```

**Expected**:

- psql connects successfully
- Query returns `1`
- pg_isready returns "accepting connections"

---

## Backend Verification

### 1. Backend Environment Variables

```bash
# Check .env file exists
ls -la apps/api/.env

# Verify required variables (example check)
grep -E "DATABASE_URL|JWT_SECRET|PORT" apps/api/.env
```

**Expected**:

- `.env` file exists in `apps/api/`
- All required variables are present
- DATABASE_URL points to localhost:5432

### 2. Start Backend Server

```bash
# From root directory
pnpm --filter @tripful/api dev
```

**Expected**:

- Server starts on port 8000
- No errors in console
- Logger shows "Server listening at http://0.0.0.0:8000"
- Database connection log shows "✓ Database connection successful"

Leave this terminal open and open a new terminal for the next steps.

### 3. Test Health Check Endpoint

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Or use httpie if installed
http GET http://localhost:8000/api/health
```

**Expected JSON response**:

```json
{
  "status": "ok",
  "timestamp": "2026-02-01T...",
  "database": "connected"
}
```

**Expected status code**: 200

### 4. Run Backend Tests

```bash
# Stop the dev server (Ctrl+C), then run tests
pnpm --filter @tripful/api test
```

**Expected**:

- All tests pass (should be 2-4 tests)
- Tests include:
  - Health check endpoint returns 200
  - Health check response has correct structure
  - Database connection test passes
- No TypeScript errors
- Test run time < 5 seconds

### 5. Backend Linting and Type Checking

```bash
# Lint backend code
pnpm --filter @tripful/api lint

# Type check backend code
pnpm --filter @tripful/api typecheck
```

**Expected**:

- Linting completes with 0 errors
- Type checking completes with 0 errors
- No warnings (or only minor warnings)

---

## Frontend Verification

### 1. Frontend Environment Variables

```bash
# Check .env.local file exists
ls -la apps/web/.env.local

# Verify API URL variable
grep NEXT_PUBLIC_API_URL apps/web/.env.local
```

**Expected**:

- `.env.local` file exists in `apps/web/`
- NEXT_PUBLIC_API_URL is set to http://localhost:8000/api

### 2. Start Frontend Server

```bash
# From root directory
pnpm --filter @tripful/web dev
```

**Expected**:

- Next.js compiles successfully
- Server starts on port 3000
- No compilation errors
- Hot reload is enabled
- Console shows "Ready in X ms"

### 3. Test Frontend in Browser

Open http://localhost:3000 in a browser.

**Expected**:

- Page loads without errors
- Welcome message is displayed: "Welcome to Tripful"
- Page is styled with Tailwind CSS
- No console errors in browser DevTools
- No 404 errors for assets

### 4. Verify shadcn/ui Components

Check that shadcn/ui components are available:

```bash
# List shadcn/ui components
ls -la apps/web/components/ui/
```

**Expected**:

- Directory contains: `button.tsx`, `input.tsx`, `form.tsx`
- Each component imports from Radix UI and uses Tailwind classes
- No TypeScript errors when importing components

### 5. Frontend Linting and Type Checking

```bash
# Lint frontend code
pnpm --filter @tripful/web lint

# Type check frontend code
pnpm --filter @tripful/web typecheck
```

**Expected**:

- Linting completes with 0 errors
- Type checking completes with 0 errors
- No warnings (or only minor Next.js warnings)

---

## Shared Package Verification

### 1. Verify Shared Package Structure

```bash
# Check shared package directory structure
ls -la shared/types/
ls -la shared/schemas/
ls -la shared/utils/
```

**Expected**:

- Each directory has an `index.ts` file
- Files export types, schemas, or utilities
- No compilation errors

### 2. Test Shared Package Imports

```bash
# Type check shared package
pnpm --filter @tripful/shared typecheck
```

**Expected**:

- Type checking passes with 0 errors
- All exports are properly typed

### 3. Verify Cross-Package Imports

Create a quick test import in the backend:

```typescript
// Temporarily add to apps/api/src/server.ts
import type { ApiResponse } from '@shared/types';
import { phoneNumberSchema } from '@shared/schemas';
```

Then run:

```bash
pnpm --filter @tripful/api typecheck
```

**Expected**:

- No TypeScript errors for shared imports
- Path aliases resolve correctly

---

## Integration Verification (Full Stack)

### 1. Start All Services Together

Stop any running dev servers, then:

```bash
# Ensure database is running
docker compose up -d

# Start both frontend and backend
pnpm dev
```

**Expected**:

- Both servers start in parallel
- Frontend on port 3000
- Backend on port 8000
- No port conflicts
- Both servers show ready messages

### 2. Test Full Stack Health Check

With both servers running:

1. Open http://localhost:3000 in browser
2. Open browser DevTools console
3. Visit http://localhost:8000/api/health in same browser

**Expected**:

- Frontend loads successfully
- Backend API returns JSON response
- CORS headers allow frontend origin
- No CORS errors in browser console

### 3. Verify Hot Reload

With both servers still running:

**Backend test**:

1. Edit `apps/api/src/routes/health.routes.ts`
2. Add a comment or change response
3. Save file

**Expected**: Server reloads automatically, changes reflected in API response

**Frontend test**:

1. Edit `apps/web/app/page.tsx`
2. Change the welcome message text
3. Save file

**Expected**: Browser refreshes automatically, new text appears

---

## Workspace-Level Verification

### 1. Run All Tests

```bash
# From root directory
pnpm test
```

**Expected**:

- Tests run for all packages
- All tests pass (backend integration tests)
- Total execution time < 10 seconds
- Coverage reports generated (if configured)

### 2. Run All Linting

```bash
pnpm lint
```

**Expected**:

- Linting runs for all packages
- 0 errors across all packages
- Consistent code style enforced

### 3. Run All Type Checking

```bash
pnpm typecheck
```

**Expected**:

- Type checking runs for all packages (web, api, shared)
- 0 TypeScript errors
- Shared types resolve correctly in consuming packages

### 4. Build All Apps

```bash
pnpm build
```

**Expected**:

- Turbo cache message appears
- Backend builds to `apps/api/dist/`
- Frontend builds to `apps/web/.next/`
- Build completes without errors
- No TypeScript errors during build

### 5. Verify Turbo Caching

```bash
# First build
pnpm build

# Second build (should use cache)
pnpm build
```

**Expected**:

- First build compiles everything
- Second build shows "FULL TURBO" or cache hits
- Second build completes much faster (< 1 second)

---

## Git Hooks Verification

### 1. Test Pre-Commit Hook

```bash
# Create a file with linting errors
echo "const foo = 'bar'" > apps/api/src/test-lint.ts

# Try to commit
git add apps/api/src/test-lint.ts
git commit -m "Test commit"
```

**Expected**:

- Commit is blocked by pre-commit hook
- Lint-staged runs
- ESLint reports errors
- Commit does not go through

**Cleanup**:

```bash
rm apps/api/src/test-lint.ts
```

### 2. Test Successful Pre-Commit

```bash
# Create a properly formatted file
echo "export const foo = 'bar'" > apps/api/src/test-lint.ts

# Commit should succeed
git add apps/api/src/test-lint.ts
git commit -m "Test commit"
```

**Expected**:

- Pre-commit hook runs
- Linting and type checking pass
- Commit goes through successfully

**Cleanup**:

```bash
git reset HEAD~1
rm apps/api/src/test-lint.ts
```

---

## Documentation Verification

### 1. Check README Completeness

```bash
# Check README exists and has content
cat README.md | head -50
```

**Expected**:

- README exists in root directory
- Contains sections:
  - Project overview
  - Prerequisites
  - Installation steps
  - Running development servers
  - Project structure
  - Available scripts
  - Environment variables
  - Troubleshooting
- Markdown is properly formatted

### 2. Verify .env.example Files

```bash
# Check example files exist
ls -la apps/api/.env.example
ls -la apps/web/.env.local.example

# Check they document all variables
cat apps/api/.env.example
cat apps/web/.env.local.example
```

**Expected**:

- Example files exist for both apps
- All required environment variables are documented
- Comments explain what each variable does
- Safe default/example values provided (not production secrets)

---

## Environment Variables Checklist

### Backend (.env)

- [ ] `NODE_ENV=development`
- [ ] `PORT=8000`
- [ ] `FRONTEND_URL=http://localhost:3000`
- [ ] `DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful`
- [ ] `TEST_DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful_test`
- [ ] `JWT_SECRET=your-secret-key-change-in-production`
- [ ] `LOG_LEVEL=info`

### Frontend (.env.local)

- [ ] `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

---

## Manual Verification Checklist

### Infrastructure

- [ ] pnpm install succeeds without errors
- [ ] Docker Compose starts PostgreSQL successfully
- [ ] Database is accessible via psql
- [ ] Health check shows database connected

### Backend

- [ ] Backend server starts on port 8000
- [ ] GET /api/health returns 200 with correct JSON
- [ ] Backend tests pass (2-4 integration tests)
- [ ] Backend linting passes (0 errors)
- [ ] Backend type checking passes (0 errors)
- [ ] Fastify plugins (CORS, JWT, rate-limit) are registered

### Frontend

- [ ] Frontend server starts on port 3000
- [ ] Home page loads with welcome message
- [ ] shadcn/ui components are installed (Button, Input, Form)
- [ ] Tailwind CSS is working (styles apply)
- [ ] Frontend linting passes (0 errors)
- [ ] Frontend type checking passes (0 errors)

### Shared Package

- [ ] Shared package has types, schemas, utils
- [ ] Cross-package imports work (no TS errors)
- [ ] Zod schemas validate correctly

### Monorepo Workflow

- [ ] `pnpm dev` starts both servers in parallel
- [ ] Hot reload works for both apps
- [ ] `pnpm test` runs all tests and passes
- [ ] `pnpm build` builds both apps successfully
- [ ] Turbo caching works (second build faster)
- [ ] Git pre-commit hook enforces linting

### Documentation

- [ ] README is comprehensive and accurate
- [ ] .env.example files exist and are documented
- [ ] All scripts are documented in README

---

## Troubleshooting Common Issues

### Issue: Port Already in Use

```bash
# Kill process on port 3000 or 8000
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### Issue: Database Connection Failed

```bash
# Check Docker container status
docker ps | grep postgres

# Restart Docker container
docker compose restart

# Check database logs
docker logs tripful-postgres
```

### Issue: Module Not Found (Path Aliases)

1. Verify `tsconfig.json` has correct path aliases
2. Restart TypeScript server in IDE
3. Clear Next.js cache: `rm -rf apps/web/.next`

### Issue: Turbo Cache Not Working

```bash
# Clear Turbo cache
rm -rf .turbo node_modules/.cache
pnpm install
```

### Issue: Git Hooks Not Running

```bash
# Reinstall Husky
rm -rf .husky
npx husky init
pnpm install
```

---

## Success Criteria Summary

Phase 1 verification is complete when:

✅ **All 45 tasks in TASKS.md are checked off**

✅ **Infrastructure**:

- Docker Compose runs PostgreSQL successfully
- Database connection test passes

✅ **Backend**:

- Server starts on port 8000
- Health check returns 200 with DB connected
- All integration tests pass (health, database)
- Linting and type checking pass

✅ **Frontend**:

- Server starts on port 3000
- Home page renders with welcome message
- shadcn/ui components are installed
- Linting and type checking pass

✅ **Monorepo**:

- Shared package exports work correctly
- Cross-package imports resolve
- `pnpm dev` starts both servers
- `pnpm test` passes all tests
- `pnpm build` builds both apps
- Turbo caching works

✅ **Code Quality**:

- ESLint 9 flat config works
- Pre-commit hooks enforce linting
- TypeScript strict mode enabled

✅ **Documentation**:

- README is comprehensive
- .env.example files exist

---

## Next Steps After Verification

Once all verification steps pass:

1. Commit the Phase 1 implementation
2. Create a pull request with summary of changes
3. Begin Phase 2: Authentication implementation
   - Database schema for users and verification codes
   - Phone authentication flow
   - JWT token generation
   - Login and verification UI

---

## Verification Sign-Off

Date: **\*\***\_\_\_**\*\***

Verified by: **\*\***\_\_\_**\*\***

- [ ] All verification steps completed
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Ready for Phase 2

---

## Automated Verification Script

You can create a script to automate verification:

```bash
#!/bin/bash
# verify-phase1.sh

echo "🔍 Verifying Phase 1 Setup..."

# Check Node.js
echo -n "Node.js version: "
node --version || exit 1

# Check pnpm
echo -n "pnpm version: "
pnpm --version || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install || exit 1

# Start database
echo "🐘 Starting PostgreSQL..."
docker compose up -d || exit 1
sleep 5

# Run tests
echo "🧪 Running all tests..."
pnpm test || exit 1

# Lint all code
echo "🔍 Linting all packages..."
pnpm lint || exit 1

# Type check all code
echo "📘 Type checking all packages..."
pnpm typecheck || exit 1

# Build all apps
echo "🏗️  Building all apps..."
pnpm build || exit 1

# Test health endpoint
echo "🏥 Testing health endpoint..."
pnpm --filter @tripful/api dev &
API_PID=$!
sleep 5
curl -f http://localhost:8000/api/health || exit 1
kill $API_PID

echo "✅ Phase 1 verification complete!"
```

Run with:

```bash
chmod +x verify-phase1.sh
./verify-phase1.sh
```
