# Phase 1: Project Setup & Infrastructure - Technical Architecture

## Overview

Phase 1 establishes the foundational monorepo infrastructure for Tripful MVP. This phase sets up the development environment, build tooling, and basic project structure without implementing business logic. The goal is a working full-stack skeleton with parallel dev servers, database connectivity, and comprehensive testing infrastructure.

## Technology Stack

### Core Versions (Latest Stable)

- **Node.js**: 22.x LTS
- **pnpm**: Latest (workspace support)
- **Turbo**: Latest (monorepo caching)
- **TypeScript**: 5.x latest
- **ESLint**: 9.x (flat config)

### Frontend (apps/web)

- **Framework**: Next.js 16.x latest (App Router)
- **UI Library**: React 19.x latest
- **Styling**: Tailwind CSS 4.x latest
- **Components**: shadcn/ui (Radix UI + Tailwind)
- **Form Handling**: React Hook Form + Zod
- **State Management**: TanStack Query v5 (deferred to Phase 2)

### Backend (apps/api)

- **Framework**: Fastify v5.x latest
- **ORM**: Drizzle ORM v0.36+ latest
- **Database**: PostgreSQL 16+ (Docker Compose)
- **Validation**: Zod (shared with frontend)
- **Plugins**:
  - `@fastify/cors` - CORS handling
  - `@fastify/jwt` - JWT authentication
  - `@fastify/rate-limit` - Rate limiting
  - `@fastify/swagger` - API documentation (optional)

### Shared (shared/)

- **Validation**: Zod schemas
- **Types**: TypeScript type definitions
- **Utils**: Shared utility functions (date formatting, timezone handling)

### Development Tools

- **Testing**: Vitest (unit + integration tests)
- **Linting**: ESLint 9 flat config
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged
- **Containerization**: Docker + Docker Compose

## Monorepo Structure

```
tripful/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── app/                  # App Router pages
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Home page
│   │   │   └── globals.css       # Global styles
│   │   ├── components/
│   │   │   └── ui/               # shadcn/ui components
│   │   ├── lib/
│   │   │   └── utils.ts          # cn() helper
│   │   ├── .env                  # Environment variables (gitignored)
│   │   ├── .env.example          # Example environment variables
│   │   ├── components.json       # shadcn/ui config
│   │   ├── next.config.ts        # Next.js configuration
│   │   ├── tailwind.config.ts    # Tailwind configuration
│   │   ├── tsconfig.json         # TypeScript config (extends base)
│   │   ├── postcss.config.mjs    # PostCSS config for Tailwind
│   │   └── package.json
│   │
│   └── api/                      # Fastify backend
│       ├── src/
│       │   ├── server.ts         # Fastify app initialization
│       │   ├── config/
│       │   │   ├── database.ts   # Drizzle config + connection
│       │   │   └── env.ts        # Environment variable validation
│       │   ├── routes/
│       │   │   └── health.routes.ts  # Health check endpoint
│       │   ├── controllers/
│       │   │   └── health.controller.ts
│       │   ├── services/
│       │   │   └── health.service.ts
│       │   ├── middleware/
│       │   │   └── error.middleware.ts
│       │   ├── db/
│       │   │   └── schema/       # Drizzle schema (empty in Phase 1)
│       │   └── types/
│       │       └── index.ts
│       ├── tests/
│       │   ├── integration/
│       │   │   ├── health.test.ts
│       │   │   └── database.test.ts
│       │   └── setup.ts          # Test environment setup
│       ├── .env                  # Environment variables (gitignored)
│       ├── .env.example          # Example environment variables
│       ├── drizzle.config.ts     # Drizzle Kit configuration
│       ├── tsconfig.json         # TypeScript config (extends base)
│       ├── vitest.config.ts      # Vitest configuration
│       └── package.json
│
├── shared/                       # Shared code (monolithic)
│   ├── types/
│   │   └── index.ts              # Common TypeScript types
│   ├── schemas/
│   │   └── index.ts              # Zod validation schemas
│   ├── utils/
│   │   └── index.ts              # Shared utilities
│   ├── tsconfig.json             # TypeScript config (extends base)
│   └── package.json
│
├── docker-compose.yml            # PostgreSQL service
├── turbo.json                    # Turbo configuration (caching, pipelines)
├── pnpm-workspace.yaml           # pnpm workspace definition
├── tsconfig.base.json            # Base TypeScript config
├── eslint.config.js              # Root ESLint config (flat)
├── .husky/                       # Git hooks
│   └── pre-commit                # Lint + typecheck hook
├── package.json                  # Root package.json (workspace scripts)
├── .gitignore                    # Git ignore patterns
├── README.md                     # Comprehensive setup guide
└── demo/                         # Design mockups (separate, untouched)
```

## Path Aliases

### apps/web

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@shared/types": ["../../shared/types"],
      "@shared/schemas": ["../../shared/schemas"],
      "@shared/utils": ["../../shared/utils"]
    }
  }
}
```

### apps/api

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/types": ["../../shared/types"],
      "@shared/schemas": ["../../shared/schemas"],
      "@shared/utils": ["../../shared/utils"]
    }
  }
}
```

## Development Workflow

### Starting Development Servers

```bash
# From root directory
pnpm install              # Install all dependencies
pnpm dev                  # Start both web (3000) and api (8000) in parallel

# Or individually
pnpm --filter web dev     # Frontend only
pnpm --filter api dev     # Backend only
```

### Running Tests

```bash
pnpm test                 # Run all tests
pnpm test:web             # Frontend tests only
pnpm test:api             # Backend tests only
```

### Linting and Type Checking

```bash
pnpm lint                 # Lint all packages
pnpm typecheck            # Type check all packages
```

### Building for Production

```bash
pnpm build                # Build all apps (Turbo cached)
```

## Database Setup

### Docker Compose Configuration

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tripful-postgres
    environment:
      POSTGRES_USER: tripful
      POSTGRES_PASSWORD: tripful_dev
      POSTGRES_DB: tripful
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U tripful']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Connection String

```
DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful
TEST_DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful_test
```

### Drizzle Configuration

```typescript
// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Database Connection (Phase 1)

In Phase 1, we only verify the database connection works. No schema or migrations are created.

```typescript
// apps/api/src/config/database.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Test connection
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}
```

## Fastify Server Structure

### Server Initialization

```typescript
// apps/api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { healthRoutes } from './routes/health.routes';
import { errorMiddleware } from './middleware/error.middleware';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: {
    expiresIn: '7d',
  },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

// Error handling
fastify.setErrorHandler(errorMiddleware);

// Routes
await fastify.register(healthRoutes, { prefix: '/api/health' });

const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 8000,
      host: '0.0.0.0',
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Health Check Endpoint

```typescript
// apps/api/src/routes/health.routes.ts
import { FastifyInstance } from 'fastify';
import { healthController } from '../controllers/health.controller';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', healthController.check);
}

// apps/api/src/controllers/health.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { healthService } from '../services/health.service';

export const healthController = {
  async check(request: FastifyRequest, reply: FastifyReply) {
    const health = await healthService.getStatus();
    return reply.status(200).send(health);
  },
};

// apps/api/src/services/health.service.ts
import { testConnection } from '../config/database';

export const healthService = {
  async getStatus() {
    const dbConnected = await testConnection();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
    };
  },
};
```

## Frontend Structure

### Next.js App Router Setup

```typescript
// apps/web/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tripful',
  description: 'Collaborative trip planning platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

// apps/web/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">Welcome to Tripful</h1>
    </main>
  )
}
```

### shadcn/ui Setup

```bash
# Initialize shadcn/ui
cd apps/web
npx shadcn@latest init

# Add basic components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add form
```

Configuration (`apps/web/components.json`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

## Testing Infrastructure

### Vitest Configuration

```typescript
// apps/api/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared/types': path.resolve(__dirname, '../../shared/types'),
      '@shared/schemas': path.resolve(__dirname, '../../shared/schemas'),
      '@shared/utils': path.resolve(__dirname, '../../shared/utils'),
    },
  },
});
```

### Test Database Setup

```typescript
// apps/api/tests/setup.ts
import { Pool } from 'pg';
import { beforeAll, afterAll } from 'vitest';

const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

beforeAll(async () => {
  // Test database connection
  await testPool.query('SELECT 1');
});

afterAll(async () => {
  await testPool.end();
});
```

### Sample Tests

```typescript
// apps/api/tests/integration/health.test.ts
import { describe, it, expect } from 'vitest';
import { build } from '../helpers';

describe('Health Check', () => {
  it('GET /api/health returns 200', async () => {
    const app = await build();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      database: 'connected',
    });

    await app.close();
  });
});

// apps/api/tests/integration/database.test.ts
import { describe, it, expect } from 'vitest';
import { testConnection } from '@/config/database';

describe('Database Connection', () => {
  it('connects to PostgreSQL successfully', async () => {
    const connected = await testConnection();
    expect(connected).toBe(true);
  });
});
```

## Environment Variables

### Backend (.env.example)

```bash
# Server
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful
TEST_DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5432/tripful_test

# JWT (generate random string for production)
JWT_SECRET=your-secret-key-change-in-production

# Logging
LOG_LEVEL=info
```

### Frontend (.env.example)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Turbo Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", "eslint.config.js"],
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

## Git Hooks

### Husky Setup

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### lint-staged Configuration

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

## Build and Deployment (Phase 1 Notes)

Phase 1 focuses on local development. Production build and deployment configurations are deferred to later phases. However, the infrastructure is set up to support:

- **Frontend**: Vercel deployment (Next.js native)
- **Backend**: Railway or AWS (Dockerized Fastify app)
- **Database**: Managed PostgreSQL (Supabase, Neon, or RDS)

## Success Criteria

Phase 1 is complete when:

1. ✅ Monorepo structure exists with pnpm workspaces
2. ✅ Turbo caching works for dev, build, lint, test
3. ✅ Frontend runs on http://localhost:3000 with shadcn/ui components
4. ✅ Backend runs on http://localhost:8000 with health check endpoint
5. ✅ PostgreSQL runs via Docker Compose and connects successfully
6. ✅ `pnpm dev` starts both servers in parallel
7. ✅ `pnpm test` runs sample tests (health check, DB connection)
8. ✅ `pnpm lint` and `pnpm typecheck` pass
9. ✅ Git pre-commit hooks enforce linting and type-checking
10. ✅ README documents complete setup and usage
11. ✅ Both .env and .env.example files exist for each app

## Out of Scope (Deferred to Later Phases)

- Database schema and migrations
- Authentication implementation
- Business logic (trips, events, RSVPs)
- TanStack Query setup (Phase 2)
- SMS integration (Phase 2)
- E2E tests with Playwright (Phase 8)
- Production deployment configurations
- CI/CD pipelines
