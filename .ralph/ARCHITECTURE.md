# Architecture: API Audit & Fix

Comprehensive refactor of the Tripful API based on Drizzle ORM and Fastify best practices audits. Backend-only changes — no UI modifications.

## Overview

Address all findings from two code audits:

1. **Drizzle ORM audit** — transactions, unique constraints, relations, count aggregates, pagination, schema improvements
2. **Fastify best practices audit** — plugin architecture, route schemas with Zod type provider, typed errors, security headers, logging, configuration, graceful shutdown

## Dependencies to Install

```bash
# Fastify plugins & type provider
pnpm add @fastify/type-provider-zod @fastify/helmet @fastify/error @fastify/under-pressure close-with-grace

# Logging
pnpm add -D pino-pretty
```

## 1. Fastify Plugin Architecture

Refactor from module singletons to Fastify plugin/decorator pattern.

### Database Plugin (`src/plugins/database.ts`)

```typescript
import fp from "fastify-plugin";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import Pool from "pg";
import * as schema from "../db/schema/index.js";

export default fp(async (fastify) => {
  const pool = new Pool({ connectionString: fastify.config.DATABASE_URL, ... });
  const db = drizzle(pool, { schema }); // Pass schema to enable relational API

  fastify.decorate("db", db);
  fastify.addHook("onClose", async () => { await pool.end(); });
}, { name: "database" });
```

### Config Plugin (`src/plugins/config.ts`)

Decorates `fastify.config` with validated env variables. Replaces direct import of `env` singleton.

### Service Plugins

Each service becomes a plugin that declares dependencies:

```typescript
// src/plugins/auth-service.ts
export default fp(
  async (fastify) => {
    fastify.decorate("authService", new AuthService(fastify.db, fastify.jwt));
  },
  { name: "auth-service", dependencies: ["database"] },
);
```

Services to convert:

- `auth.service.ts` → `plugins/auth-service.ts` (depends on: database, jwt)
- `trip.service.ts` → `plugins/trip-service.ts` (depends on: database)
- `permissions.service.ts` → `plugins/permissions-service.ts` (depends on: database)
- `upload.service.ts` → `plugins/upload-service.ts` (depends on: config)
- `sms.service.ts` → `plugins/sms-service.ts` (no deps)
- `health.service.ts` → `plugins/health-service.ts` (depends on: database)

### Type Augmentation (`src/types/index.ts`)

```typescript
declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
    config: EnvConfig;
    authService: AuthService;
    tripService: TripService;
    permissionsService: PermissionsService;
    uploadService: UploadService;
    smsService: SMSService;
    healthService: HealthService;
  }
}
```

### App Builder Pattern (`src/app.ts`)

Extract `buildApp()` from `server.ts`. Both `server.ts` and `tests/helpers.ts` call it:

```typescript
// src/app.ts
export async function buildApp(opts?: FastifyServerOptions) {
  const app = Fastify(opts);
  // Register all plugins, routes, hooks
  return app;
}

// src/server.ts
import { buildApp } from "./app.js";
import closeWithGrace from "close-with-grace";

const app = await buildApp({ logger: { ... } });
await app.listen({ port, host });
closeWithGrace(async ({ signal, err }) => { await app.close(); });
```

## 2. Route Schemas with @fastify/type-provider-zod

### Setup

Register the Zod type provider on the Fastify instance:

```typescript
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "@fastify/type-provider-zod";

const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
```

### Route Schema Pattern

Every route gets `schema` with `params`, `body`, `querystring`, and `response`:

```typescript
// Example: GET /api/trips/:id
fastify.get(
  "/:id",
  {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: tripDetailResponseSchema,
        404: errorResponseSchema,
      },
    },
  },
  tripController.getTripById,
);
```

Reuse existing Zod schemas from `@tripful/shared/schemas` where possible. Create new response schemas as needed.

### Routes to Add Schemas

| Route                                         | Params            | Body                   | Query         | Response           |
| --------------------------------------------- | ----------------- | ---------------------- | ------------- | ------------------ |
| `GET /api/health`                             | -                 | -                      | -             | 200                |
| `POST /api/auth/request-code`                 | -                 | phone                  | -             | 200, 400, 429      |
| `POST /api/auth/verify-code`                  | -                 | phone, code            | -             | 200, 400, 401      |
| `POST /api/auth/complete-profile`             | -                 | displayName, timezone? | -             | 200, 400           |
| `GET /api/auth/me`                            | -                 | -                      | -             | 200, 401           |
| `POST /api/auth/logout`                       | -                 | -                      | -             | 200                |
| `GET /api/trips`                              | -                 | -                      | page?, limit? | 200                |
| `POST /api/trips`                             | -                 | createTrip             | -             | 201, 400, 409      |
| `GET /api/trips/:id`                          | id (uuid)         | -                      | -             | 200, 404           |
| `PUT /api/trips/:id`                          | id (uuid)         | updateTrip             | -             | 200, 400, 403, 404 |
| `DELETE /api/trips/:id`                       | id (uuid)         | -                      | -             | 200, 403, 404      |
| `POST /api/trips/:id/co-organizers`           | id (uuid)         | phone                  | -             | 200, 400, 403      |
| `DELETE /api/trips/:id/co-organizers/:userId` | id, userId (uuid) | -                      | -             | 200, 400, 403, 404 |
| `POST /api/trips/:id/cover-image`             | id (uuid)         | multipart              | -             | 200, 400, 403      |
| `DELETE /api/trips/:id/cover-image`           | id (uuid)         | -                      | -             | 200, 403, 404      |

### Controller Simplification

With route schemas handling validation, controllers no longer need:

- Manual `safeParse()` calls
- UUID format checks
- `as` type casts on `request.params`

Fastify auto-returns 400 for schema violations.

## 3. Typed Errors with @fastify/error

Replace string-based error matching with typed error classes.

### Error Definitions (`src/errors.ts`)

```typescript
import createError from "@fastify/error";

// Auth errors
export const UnauthorizedError = createError("UNAUTHORIZED", "%s", 401);
export const ProfileIncompleteError = createError(
  "PROFILE_INCOMPLETE",
  "%s",
  403,
);

// Trip errors
export const TripNotFoundError = createError("TRIP_NOT_FOUND", "%s", 404);
export const PermissionDeniedError = createError(
  "PERMISSION_DENIED",
  "%s",
  403,
);
export const MemberLimitExceededError = createError(
  "MEMBER_LIMIT_EXCEEDED",
  "%s",
  409,
);
export const CoOrganizerNotFoundError = createError(
  "CO_ORGANIZER_NOT_FOUND",
  "%s",
  400,
);
export const CannotRemoveCreatorError = createError(
  "CANNOT_REMOVE_CREATOR",
  "%s",
  400,
);
export const DuplicateMemberError = createError("DUPLICATE_MEMBER", "%s", 409);

// Upload errors
export const FileTooLargeError = createError("FILE_TOO_LARGE", "%s", 400);
export const InvalidFileTypeError = createError("INVALID_FILE_TYPE", "%s", 400);
```

Services throw typed errors. Controllers catch them or let the error handler deal with them. The centralized error handler handles `@fastify/error` instances by reading `.statusCode` and `.code`.

## 4. Drizzle ORM Improvements

### Transactions (`trip.service.ts`)

Wrap multi-step mutations in `db.transaction()`:

```typescript
const trip = await fastify.db.transaction(async (tx) => {
  const [trip] = await tx.insert(trips).values({ ... }).returning();
  await tx.insert(members).values({ tripId: trip.id, userId, status: "going" });
  if (coOrganizerUserIds.length > 0) {
    await tx.insert(members).values(coOrganizerUserIds.map(...));
  }
  return trip;
});
```

Methods needing transactions:

- `createTrip()` — trip + creator member + co-organizer members
- `addCoOrganizers()` — member count check + inserts (race condition)
- `cancelTrip()` — could be wrapped for consistency

### Unique Constraint on Members

Add to schema:

```typescript
// In members table definition
uniqueTripUser: unique("members_trip_user_unique").on(table.tripId, table.userId),
```

Generate and apply migration.

### Drizzle Relations (`src/db/schema/relations.ts`)

```typescript
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  createdTrips: many(trips),
  memberships: many(members),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(users, { fields: [trips.createdBy], references: [users.id] }),
  members: many(members),
}));

export const membersRelations = relations(members, ({ one }) => ({
  trip: one(trips, { fields: [members.tripId], references: [trips.id] }),
  user: one(users, { fields: [members.userId], references: [users.id] }),
}));
```

### Count Aggregate Fix

```typescript
// getMemberCount — use SQL COUNT instead of fetching all rows
const [{ value }] = await db
  .select({ value: count() })
  .from(members)
  .where(eq(members.tripId, tripId));
```

### Pagination on getUserTrips

```typescript
// Add pagination params
async getUserTrips(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  // Use relational API for efficient loading
  // Return { data: TripSummary[], meta: { total, page, limit, totalPages } }
}
```

### Column Selection on Auth Middleware Hot Path

```typescript
// Select only needed columns in user lookup
db.select({ id: users.id, displayName: users.displayName })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

## 5. Security Improvements

### @fastify/helmet

Register in `buildApp()`:

```typescript
await app.register(helmet, {
  contentSecurityPolicy: false, // Disable CSP for API-only server
});
```

### Rate Limit on verify-code

Add rate limiting to `POST /api/auth/verify-code`:

```typescript
// 10 attempts per 15 minutes per phone number
preHandler: [
  fastify.rateLimit({
    max: 10,
    timeWindow: "15 minutes",
    keyGenerator: (request) => request.body?.phoneNumber || request.ip,
  }),
];
```

### @fastify/under-pressure

```typescript
await app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 1_000_000_000,
  maxRssBytes: 1_500_000_000,
  retryAfter: 50,
});
```

## 6. Logging Improvements

### Replace console.log

All `console.log`/`console.error` calls → `fastify.log.info()`/`fastify.log.error()`. Files:

- `config/database.ts` (lines 23-24, 28, 34) — becomes plugin, uses `fastify.log`
- `config/env.ts` (lines 69-72) — runs before Fastify, keep `console.error` here only
- `config/jwt.ts` (line 38) — use `fastify.log` after plugin refactor
- `services/sms.service.ts` (lines 27-33) — use `fastify.log`

### Logger Redaction

```typescript
const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.phoneNumber",
    ],
  },
});
```

### pino-pretty for Development

```typescript
logger: env.NODE_ENV === "development"
  ? { transport: { target: "pino-pretty" }, level: "debug" }
  : { level: config.LOG_LEVEL, redact: [...] }
```

## 7. Configuration Improvements

### Explicit Feature Flags

Add to env schema:

```typescript
COOKIE_SECURE: z.coerce.boolean().default(process.env.NODE_ENV === "production"),
EXPOSE_ERROR_DETAILS: z.coerce.boolean().default(process.env.NODE_ENV === "development"),
ENABLE_FIXED_VERIFICATION_CODE: z.coerce.boolean().default(process.env.NODE_ENV !== "production"),
```

Replace all `process.env.NODE_ENV` checks in services/controllers with these flags.

### process.cwd() → import.meta.dirname

Replace in:

- `config/jwt.ts` line 17
- `server.ts` line 80 (static file serving)

## 8. Additional Improvements

### Scoped Auth Hooks

Use plugin encapsulation for trip routes:

```typescript
// trip.routes.ts
fastify.register(async (scope) => {
  scope.addHook("preHandler", authenticate);
  scope.addHook("preHandler", requireCompleteProfile);
  // All routes in this scope are protected
  scope.post("/", tripController.createTrip);
  scope.put("/:id", tripController.updateTrip);
  // ...
});
```

Read-only routes (GET) remain outside the scoped plugin.

### Multipart Limits

```typescript
await app.register(multipart, {
  limits: {
    fileSize: config.MAX_FILE_SIZE,
    files: 1,
    fieldNameSize: 100,
    fields: 10,
    headerPairs: 2000,
  },
  throwFileSizeLimit: true,
});
```

### Liveness/Readiness Health Checks

```typescript
// GET /api/health/live — always 200 if process is running
// GET /api/health/ready — checks DB connectivity
```

### Not Found Handler

```typescript
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
});
```

### trustProxy Configuration

Add `TRUST_PROXY` env variable (default: false). Set on Fastify instance for correct `request.ip` behind load balancers.

## Testing Strategy

### Unit Tests

- Service methods (with mocked db via plugin decoration)
- Error class instantiation and properties
- Env config validation
- Phone validation utilities

### Integration Tests

- All API endpoints with route schema validation (400 on bad input)
- Transaction rollback behavior (create trip with invalid co-organizer)
- Unique constraint enforcement (duplicate member)
- Pagination responses
- Rate limiting on verify-code
- Security headers present (helmet)
- Graceful shutdown behavior

### E2E Tests

- Existing Playwright E2E tests must continue passing
- No new E2E tests needed (backend-only changes)

### Regression

- All existing tests updated to use `buildApp()` from `src/app.ts`
- Full test suite run after each task
