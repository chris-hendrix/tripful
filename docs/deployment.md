# Tripful - Deployment Guide

## Prerequisites

- PostgreSQL 16+ accessible
- Node.js 22+ with pnpm 10+
- All environment variables configured (see `.env.example` files)

## Pre-Deployment Checklist

### 1. Database Backup

Before deploying any migration:

```bash
# Create a backup of the current database
pg_dump -h localhost -p 5433 -U tripful tripful > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created and is not empty
ls -lh backup_*.sql
head -5 backup_*.sql
```

### 2. Migration Verification

Review and test all pending migrations:

```bash
# List migration files
ls -la apps/api/src/db/migrations/

# Migration order (must run sequentially):
# 0000_smooth_sharon_ventura.sql  - Phase 2: users, verification_codes
# 0001_conscious_maestro.sql      - Phase 3: trips, members
# 0002_mysterious_hercules.sql    - Phase 4: events (+ event_type enum)
# 0003_deep_sinister_six.sql      - Phase 4: accommodations
# 0004_cute_shinobi_shaw.sql      - Phase 4: member_travel (+ member_travel_type enum)

# Apply pending migrations
cd apps/api && pnpm db:migrate
```

### 3. Environment Variables

Verify all required environment variables are set:

**Backend (`apps/api/.env`):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Minimum 32 characters
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV` - Set to `production` for production deployments

**Frontend (`apps/web/.env.local`):**
- `NEXT_PUBLIC_API_URL` - Backend API URL

No new environment variables were added in Phase 4.

### 4. Quality Checks

Run all checks before deploying:

```bash
pnpm lint        # No linting errors
pnpm typecheck   # No TypeScript errors
pnpm test        # All unit/integration tests pass
pnpm test:e2e    # All E2E tests pass (requires dev servers)
```

## Deployment Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Shared Package

The shared package must be built first, as both backend and frontend depend on it.

```bash
pnpm build
```

This runs the build at the workspace root, which builds the shared package along with all other packages.

### 3. Run Database Migrations

Migrations are additive (new tables only) — no breaking changes to existing tables.

```bash
cd apps/api && pnpm db:migrate
```

### 4. Deploy Backend API

```bash
cd apps/api && pnpm build && pnpm start
```

### 5. Deploy Frontend

```bash
cd apps/web && pnpm build && pnpm start
```

## Rollback Procedure

### Database Rollback

If a migration fails, restore from backup:

```bash
# Drop the database and recreate
dropdb -h localhost -p 5433 -U tripful tripful
createdb -h localhost -p 5433 -U tripful tripful

# Restore from backup
psql -h localhost -p 5433 -U tripful tripful < backup_YYYYMMDD_HHMMSS.sql
```

### Application Rollback

Revert to the previous git commit and redeploy:

```bash
git checkout <previous-commit>
pnpm install
pnpm build

# Deploy backend
cd apps/api && pnpm build && pnpm start

# In a separate terminal, deploy frontend
cd apps/web && pnpm build && pnpm start
```

## Phase-Specific Notes

### Phase 4: Itinerary View Modes

- **New tables**: `events`, `accommodations`, `member_travel`
- **New enums**: `event_type` (travel, meal, activity), `member_travel_type` (arrival, departure)
- **Zero-downtime**: All migrations are additive (new tables), no breaking changes
- **API backward compatibility**: Existing trip endpoints remain unchanged
- **No feature flags**: Deploy directly when ready
