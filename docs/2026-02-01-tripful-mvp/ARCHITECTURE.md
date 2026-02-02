---
date: 2026-02-01
topic: Tripful - High-Level Architecture Document (v1)
status: Core flows implemented in demo
---

# Tripful - High-Level Architecture

> **Note**: Core flows of the design have been implemented in a demo version. This document reflects the updated architecture based on implementation learnings.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [System Components](#system-components)
5. [Data Model](#data-model)
6. [API Design](#api-design)
7. [Authentication Flow](#authentication-flow)
8. [Key Features Implementation](#key-features-implementation)
9. [Development Practices](#development-practices)
10. [Testing Strategy](#testing-strategy)
11. [Security Considerations](#security-considerations)
12. [Performance Considerations](#performance-considerations)

---

## System Overview

Tripful is a collaborative trip planning platform that enables group travel coordination through shared itineraries. The system follows a modern client-server architecture with a **Next.js frontend** and a **Fastify backend API**, backed by **PostgreSQL** with **Drizzle ORM**.

### Architecture Style

- **Client-Server Architecture**: Clear separation between frontend and backend
- **RESTful API**: HTTP-based API following REST principles
- **Server-Side Rendering (SSR)**: Next.js App Router with React Server Components
- **Service-Oriented**: Modular service layer for business logic

### Core Requirements

- Mobile-first responsive web application
- Phone-based authentication with SMS verification
- Real-time timezone handling (store UTC, display in trip/local timezone)
- Collaborative itinerary editing with permission system
- Soft delete support for data recovery
- Support for up to 25 members per trip, 50 events per trip

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Next.js 16 App Router (TypeScript)              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Pages      │  │  Components  │  │   App State  │  │   │
│  │  │  (RSC + CC)  │  │   (React)    │  │  (TanStack)  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ HTTP/REST                         │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Fastify Server (TypeScript)                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Routes     │  │  Controllers │  │  Middleware  │  │   │
│  │  │  (REST API)  │  │              │  │  (Auth/CORS) │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Service Layer (Business Logic)             │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌─────────┐  │   │
│  │  │ Trip  │ │ Event │ │ Auth  │ │ RSVP  │ │ Storage │  │   │
│  │  │Service│ │Service│ │Service│ │Service│ │ Service │  │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        Drizzle ORM (Type-Safe Query Builder)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Schema     │  │  Migrations  │  │   Queries    │  │   │
│  │  │ Definitions  │  │              │  │  (Type-Safe) │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL 16 Database                      │   │
│  │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │   │
│  │   │ Users  │ │ Trips  │ │ Events │ │ RSVPs  │  ...     │   │
│  │   └────────┘ └────────┘ └────────┘ └────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES (MVP)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  SMS Service │  │File Storage  │                             │
│  │  (Mock Dev)  │  │  (Abstract)  │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                   │
│  Note: Verification codes stored in database for MVP             │
│  Production: Redis for distributed caching (optional)            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

- **Framework**: Next.js 16 (App Router with React Server Components)
- **Language**: TypeScript 5.9.x
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (copy-paste component library)
  - Built on Radix UI primitives
  - Fully customizable and accessible
  - Includes Dialog, Form, Input, Button, Card, etc.
- **State Management**: TanStack Query v5 (React Query)
- **Form Handling**: React Hook Form + Zod validation
- **Validation**: Zod (shared with backend)
- **Date/Time**: date-fns + date-fns-tz (timezone handling)

### Backend

- **Runtime**: Node.js 22.x (LTS)
- **Framework**: Fastify v5.x
- **Language**: TypeScript 5.9.x
- **ORM**: Drizzle ORM v0.36+
- **Database**: PostgreSQL 16+
- **Validation**: Zod (shared with frontend)
- **Authentication**: Custom JWT implementation with database-backed verification codes

### External Services (MVP - Mocked)

- **SMS Provider**: Mock SMS service (console logging)
  - Production: Twilio or AWS SNS
- **File Storage**: Abstract storage adapter (in-memory for MVP)
  - Interface compatible with S3, Cloudinary, local filesystem
  - Production: AWS S3 with presigned URLs

### Development Tools

- **Testing**: Vitest (unit tests) + Playwright (E2E tests)
- **API Testing**: MSW (Mock Service Worker) for frontend
- **Linting**: ESLint 9.x (flat config)
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged
- **Package Manager**: pnpm (workspace support)

---

## System Components

### 1. Frontend Application (Next.js)

#### Directory Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   │   ├── login/
│   │   └── verify/
│   ├── (app)/                    # Authenticated routes group
│   │   ├── dashboard/
│   │   ├── trips/[id]/
│   │   │   ├── page.tsx          # Trip itinerary view
│   │   │   ├── edit/
│   │   │   └── settings/
│   │   └── create-trip/
│   ├── layout.tsx                # Root layout with providers
│   ├── providers.tsx             # TanStack Query provider
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui components (Dialog, Button, Input, etc.)
│   ├── trip/                     # Trip-specific components
│   ├── event/                    # Event components
│   └── forms/                    # Form components
├── lib/
│   ├── api/                      # API client functions
│   ├── hooks/                    # Custom React hooks
│   ├── utils.ts                  # Utility functions (includes cn() from shadcn)
│   └── schemas/                  # Zod validation schemas
├── types/
│   └── api.ts                    # API response types
├── components.json               # shadcn/ui configuration
└── public/
    └── assets/
```

#### shadcn/ui Setup

shadcn/ui is a collection of re-usable components built with Radix UI and Tailwind CSS. Components are copied directly into your codebase for full customization.

**Installation:**

```bash
# Initialize shadcn/ui in Next.js project
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add dialog
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add form
npx shadcn@latest add card
npx shadcn@latest add select
npx shadcn@latest add calendar
npx shadcn@latest add popover
```

**Configuration (components.json):**

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

**Key Components for Tripful:**

- `Dialog` - Event creation, trip settings
- `Form` - All forms with React Hook Form integration
- `Input`, `Textarea` - Form fields
- `Button` - CTAs and actions
- `Card` - Trip cards, event cards
- `Select` - Dropdowns (timezone, event type)
- `Calendar` + `Popover` - Date pickers
- `Badge` - Event types, RSVP status
- `Avatar` - User profiles

#### Key Features

**React Server Components (RSC)**

- Initial page loads with server-rendered content
- Automatic code splitting and optimization
- Direct database access in server components (for public data)
- Reduced client bundle size

**Client Components**

- Interactive UI elements (forms, modals, animations)
- TanStack Query for data fetching and caching
- Optimistic updates for better UX
- Real-time timezone conversion

**TanStack Query Integration**

```typescript
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = makeQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

#### Routing Strategy

- `/` - Landing page (public)
- `/login` - Phone authentication
- `/verify` - SMS code verification
- `/dashboard` - User's trip list
- `/trips/[id]` - Trip itinerary view (requires RSVP)
- `/trips/[id]/settings` - Trip settings (organizer only)
- `/create-trip` - Create new trip

**Modal/Dialog Patterns:**

- Events, accommodations, and member travel are created via **shadcn/ui Dialog** components (not routes)
- Edit operations also use dialogs for better UX
- Reduces navigation complexity and provides better mobile experience

### 2. Backend API (Fastify)

#### Directory Structure

```
apps/api/
├── src/
│   ├── server.ts                 # Fastify app initialization
│   ├── config/
│   │   ├── database.ts           # Drizzle config
│   │   ├── redis.ts              # Redis config
│   │   └── env.ts                # Environment variables
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── trips.routes.ts
│   │   ├── events.routes.ts
│   │   ├── accommodations.routes.ts
│   │   ├── travel.routes.ts      # Member travel (arrivals/departures)
│   │   └── rsvp.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── trips.controller.ts
│   │   ├── events.controller.ts
│   │   └── ...
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── trips.service.ts
│   │   ├── events.service.ts
│   │   ├── sms.service.ts        # Abstract SMS interface
│   │   ├── storage.service.ts    # Abstract storage interface
│   │   └── permissions.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── validate.middleware.ts # Zod validation
│   │   ├── error.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── verification_codes.ts
│   │   │   ├── trips.ts
│   │   │   ├── organizers.ts
│   │   │   ├── invitations.ts
│   │   │   ├── members.ts
│   │   │   ├── events.ts
│   │   │   ├── accommodations.ts
│   │   │   ├── travel.ts
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── jwt.ts
│       ├── timezone.ts
│       └── validation.ts
├── tests/
│   ├── unit/
│   └── integration/
└── package.json
```

#### Fastify Configuration

**Server Setup**

```typescript
// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

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

// Routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(tripsRoutes, { prefix: '/api/trips' });
await fastify.register(eventsRoutes, { prefix: '/api/events' });
// ... other routes

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

**Plugin Architecture**

- `@fastify/cors` - CORS handling
- `@fastify/jwt` - JWT authentication
- `@fastify/rate-limit` - Rate limiting for SMS endpoints
- `@fastify/swagger` - API documentation (future)
- `@fastify/multipart` - File uploads

### 3. Database Layer (PostgreSQL + Drizzle ORM)

#### Drizzle Configuration

```typescript
// drizzle.config.ts
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

#### Schema Examples

**Users Table**

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Verification Codes Table**

```typescript
// src/db/schema/verification_codes.ts
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const verificationCodes = pgTable('verification_codes', {
  phoneNumber: varchar('phone_number', { length: 20 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
```

**Members Table (trip membership and RSVP status)**

```typescript
// src/db/schema/members.ts
import { pgTable, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { trips, users } from '.';

export const rsvpStatusEnum = pgEnum('rsvp_status', ['going', 'not_going', 'maybe', 'no_response']);

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: rsvpStatusEnum('status').notNull().default('no_response'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
```

**Note:** The `members` table represents trip membership and RSVP status. When a user is invited, a member record is created with status `no_response`. This table serves dual purpose: membership tracking and response status.

**Trips Table**

```typescript
// src/db/schema/trips.ts
import { pgTable, uuid, varchar, text, date, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  destination: text('destination').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  preferredTimezone: varchar('preferred_timezone', { length: 100 }).notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  allowMembersToAddEvents: boolean('allow_members_to_add_events').notNull().default(true),
  cancelled: boolean('cancelled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
```

**Events Table**

```typescript
// src/db/schema/events.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  time,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { trips, users } from '.';

export const eventTypeEnum = pgEnum('event_type', ['travel', 'meal', 'activity']);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  eventType: eventTypeEnum('event_type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  allDay: boolean('all_day').notNull().default(false),
  location: varchar('location', { length: 500 }),
  meetupLocation: varchar('meetup_location', { length: 200 }),
  meetupTime: time('meetup_time'),
  description: text('description'),
  links: text('links').array(),
  isOptional: boolean('is_optional').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

**Accommodations Table**

```typescript
// src/db/schema/accommodations.ts
import { pgTable, uuid, varchar, text, date, timestamp } from 'drizzle-orm/pg-core';
import { trips } from '.';

export const accommodations = pgTable('accommodations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  address: text('address'),
  checkInDate: date('check_in_date'),
  checkOutDate: date('check_out_date'),
  description: text('description'),
  links: text('links').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Accommodation = typeof accommodations.$inferSelect;
export type NewAccommodation = typeof accommodations.$inferInsert;
```

**Travel Table (member arrivals/departures)**

```typescript
// src/db/schema/travel.ts
import { pgTable, uuid, varchar, text, date, time, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { trips, members } from '.';

export const travelTypeEnum = pgEnum('travel_type', ['arrival', 'departure']);

export const travel = pgTable('travel', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  travelType: travelTypeEnum('travel_type').notNull(),
  date: date('date').notNull(),
  departingFrom: varchar('departing_from', { length: 200 }),
  departureTime: time('departure_time'),
  arrivingAt: varchar('arriving_at', { length: 200 }),
  arrivalTime: time('arrival_time'),
  travelMethod: varchar('travel_method', { length: 100 }),
  details: text('details'),
  links: text('links').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Travel = typeof travel.$inferSelect;
export type NewTravel = typeof travel.$inferInsert;
```

#### Relationships Definition

```typescript
// src/db/schema/index.ts
import { relations } from 'drizzle-orm';
import * as schema from '.';

export const usersRelations = relations(schema.users, ({ many }) => ({
  tripsCreated: many(schema.trips),
  eventsCreated: many(schema.events),
  members: many(schema.members),
}));

export const tripsRelations = relations(schema.trips, ({ one, many }) => ({
  creator: one(schema.users, {
    fields: [schema.trips.createdBy],
    references: [schema.users.id],
  }),
  events: many(schema.events),
  accommodations: many(schema.accommodations),
  members: many(schema.members),
  travel: many(schema.travel),
  invitations: many(schema.invitations),
}));

export const eventsRelations = relations(schema.events, ({ one }) => ({
  trip: one(schema.trips, {
    fields: [schema.events.tripId],
    references: [schema.trips.id],
  }),
  creator: one(schema.users, {
    fields: [schema.events.createdBy],
    references: [schema.users.id],
  }),
}));

export const membersRelations = relations(schema.members, ({ one, many }) => ({
  user: one(schema.users, {
    fields: [schema.members.userId],
    references: [schema.users.id],
  }),
  trip: one(schema.trips, {
    fields: [schema.members.tripId],
    references: [schema.trips.id],
  }),
  travel: many(schema.travel),
}));

export const travelRelations = relations(schema.travel, ({ one }) => ({
  trip: one(schema.trips, {
    fields: [schema.travel.tripId],
    references: [schema.trips.id],
  }),
  member: one(schema.members, {
    fields: [schema.travel.memberId],
    references: [schema.members.id],
  }),
}));
```

#### Database Queries with Drizzle

```typescript
// Example: Get trip with events and creator info
import { db } from '@/config/database';
import { trips, events, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const tripWithDetails = await db
  .select({
    trip: trips,
    creator: users,
  })
  .from(trips)
  .leftJoin(users, eq(trips.createdBy, users.id))
  .where(eq(trips.id, tripId))
  .limit(1);

const tripEvents = await db
  .select()
  .from(events)
  .where(eq(events.tripId, tripId))
  .orderBy(events.startDate, events.startTime);
```

### 4. Service Layer (Business Logic)

#### Abstract Service Interfaces

**SMS Service**

```typescript
// src/services/sms.service.ts
export interface ISMSService {
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
  sendInvitation(phoneNumber: string, tripName: string, tripLink: string): Promise<void>;
  sendTripUpdate(phoneNumber: string, message: string): Promise<void>;
  sendCancellation(phoneNumber: string, tripName: string): Promise<void>;
}

// Mock implementation for MVP
export class MockSMSService implements ISMSService {
  async sendVerificationCode(phoneNumber: string, code: string) {
    console.log(`[MOCK SMS] Verification code for ${phoneNumber}: ${code}`);
    // In development: Also log to a file or display in UI
  }

  async sendInvitation(phoneNumber: string, tripName: string, tripLink: string) {
    console.log(`[MOCK SMS] Invitation to ${phoneNumber}:`);
    console.log(`You've been invited to ${tripName}! ${tripLink}`);
  }

  async sendTripUpdate(phoneNumber: string, message: string) {
    console.log(`[MOCK SMS] Trip update to ${phoneNumber}: ${message}`);
  }

  async sendCancellation(phoneNumber: string, tripName: string) {
    console.log(`[MOCK SMS] Cancellation to ${phoneNumber}: ${tripName} has been cancelled`);
  }
}

// Future Twilio implementation
export class TwilioSMSService implements ISMSService {
  // Real implementation with Twilio SDK
}
```

**Storage Service**

```typescript
// src/services/storage.service.ts
export interface IStorageService {
  uploadFile(file: Buffer, filename: string, mimeType: string): Promise<string>;
  deleteFile(url: string): Promise<void>;
  getSignedUrl(url: string, expiresIn?: number): Promise<string>;
}

// Mock implementation for MVP
export class MockStorageService implements IStorageService {
  private files = new Map<string, Buffer>();

  async uploadFile(file: Buffer, filename: string, mimeType: string) {
    const fileId = `mock-${Date.now()}-${filename}`;
    this.files.set(fileId, file);
    return `http://localhost:8000/mock-storage/${fileId}`;
  }

  async deleteFile(url: string) {
    const fileId = url.split('/').pop()!;
    this.files.delete(fileId);
  }

  async getSignedUrl(url: string, expiresIn = 3600) {
    return `${url}?expires=${Date.now() + expiresIn * 1000}`;
  }
}

// Future S3 implementation
export class S3StorageService implements IStorageService {
  // Real implementation with AWS SDK
}
```

#### Permission Service

```typescript
// src/services/permissions.service.ts
export class PermissionsService {
  // Check if user is organizer
  async isOrganizer(userId: string, tripId: string): Promise<boolean> {
    const organizer = await db
      .select()
      .from(organizers)
      .where(and(eq(organizers.userId, userId), eq(organizers.tripId, tripId)))
      .limit(1);

    return organizer.length > 0;
  }

  // Check if user can add events
  async canAddEvent(userId: string, tripId: string): Promise<boolean> {
    // Must have "Going" RSVP status
    const member = await db
      .select()
      .from(members)
      .where(
        and(eq(members.userId, userId), eq(members.tripId, tripId), eq(members.status, 'going'))
      )
      .limit(1);

    if (member.length === 0) return false;

    // Check if trip allows members to add events OR user is organizer
    const trip = await db
      .select({ allowMembersToAddEvents: trips.allowMembersToAddEvents })
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);

    if (!trip[0]) return false;

    if (trip[0].allowMembersToAddEvents) return true;

    // If setting is disabled, only organizers can add
    return await this.isOrganizer(userId, tripId);
  }

  // Check if user can edit event
  async canEditEvent(userId: string, eventId: string): Promise<boolean> {
    const event = await db
      .select({
        createdBy: events.createdBy,
        tripId: events.tripId,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event[0]) return false;

    // Creator can edit their own events (if still Going)
    if (event[0].createdBy === userId) {
      const member = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.userId, userId),
            eq(members.tripId, event[0].tripId),
            eq(members.status, 'going')
          )
        )
        .limit(1);

      return member.length > 0;
    }

    // Organizers can edit any event
    return await this.isOrganizer(userId, event[0].tripId);
  }
}
```

---

## Data Model

### Entity Relationship Diagram

```
┌──────────────┐            ┌──────────────┐
│    Users     │            │    Trips     │
├──────────────┤            ├──────────────┤
│ id (PK)      │◄───────────┤ created_by   │
│ phone_number │            │ id (PK)      │
│ display_name │            │ name         │
│ timezone     │            │ destination  │
└──────────────┘            │ start_date   │
       │                    │ end_date     │
       │                    │ timezone     │
       │                    └──────────────┘
       │                           │
       │                           │
       │                    ┌──────┴───────┐
       │                    │              │
       │              ┌─────▼────┐   ┌────▼─────┐
       │              │ Events   │   │ Members  │
       │              ├──────────┤   ├──────────┤
       └──────────────┤created_by│   │id (PK)   │
                      │trip_id   │   │user_id   │
                      │type      │   │trip_id   │
                      │title     │   │status    │
                      │date/time │   └──────────┘
                      └──────────┘         │
                            │              │
                      ┌─────┴──────────────┴──┐
                      │                       │
              ┌───────▼──────┐  ┌────────────▼─┐
              │Accommodations│  │Member Travel │
              ├──────────────┤  ├──────────────┤
              │trip_id       │  │trip_id       │
              │name          │  │member_id (FK)│
              │address       │  │travel_type   │
              │check_in      │  │date/times    │
              └──────────────┘  └──────────────┘
```

### Core Tables

See [Database Layer](#3-database-layer-postgresql--drizzle-orm) section for detailed schema definitions.

**Primary Tables:**

1. `users` - User accounts
2. `verification_codes` - Phone verification codes with expiry
3. `trips` - Trip information
4. `organizers` - Trip organizers (many-to-many)
5. `invitations` - Trip invitations by phone
6. `members` - **Trip membership and RSVP status** (combined entity)
7. `events` - Itinerary events
8. `accommodations` - Where group is staying
9. `travel` - Individual member arrivals/departures

**Note on Members:** The `members` table serves as the trip membership table. When a user is invited, a member record is created, making them a trip member. The `status` field tracks their RSVP response (going/not_going/maybe/no_response). This design keeps membership and status in sync.

**Indexes:**

- `users.phone_number` (unique)
- `trips.created_by`
- `events.trip_id, events.start_date` (composite)
- `members.user_id, members.trip_id` (composite, unique)
- `members.id` (primary key)
- `invitations.invitee_phone_number, invitations.trip_id` (composite)

---

## API Design

### REST API Endpoints

#### Authentication

```
POST   /api/auth/request-code
  Body: { phoneNumber: string, countryCode: string }
  Response: { success: boolean, message: string }

POST   /api/auth/verify-code
  Body: { phoneNumber: string, code: string }
  Response: { token: string, user: User }

POST   /api/auth/refresh
  Headers: { Authorization: 'Bearer <token>' }
  Response: { token: string }

GET    /api/auth/me
  Headers: { Authorization: 'Bearer <token>' }
  Response: { user: User }
```

#### Trips

```
GET    /api/trips
  Query: { status?: 'upcoming' | 'past' }
  Response: { trips: Trip[] }

GET    /api/trips/:id
  Response: { trip: Trip, creator: User, rsvpStatus?: string }

POST   /api/trips
  Body: { name, destination, startDate?, endDate?, timezone, description?, coverImage? }
  Response: { trip: Trip }

PATCH  /api/trips/:id
  Body: Partial<Trip>
  Response: { trip: Trip }

DELETE /api/trips/:id
  Response: { success: boolean }

GET    /api/trips/:id/members
  Response: { members: Array<{ user: User, member: Member }> }

POST   /api/trips/:id/invite
  Body: { phoneNumbers: string[] }
  Response: { sent: number, failed: string[] }
```

#### RSVPs

**Note:** RSVP endpoints operate on the `members` table, updating the member's `status` field.

```
POST   /api/trips/:tripId/rsvp
  Body: { status: 'going' | 'not_going' | 'maybe' }
  Response: { member: Member }

GET    /api/trips/:tripId/rsvp
  Response: { member: Member }
```

#### Events

```
GET    /api/trips/:tripId/events
  Query: { type?: 'travel' | 'meal' | 'activity', includeDeleted?: boolean }
  Response: { events: Event[] }

POST   /api/trips/:tripId/events
  Body: { type, title, startDate, startTime?, location?, description?, links?, isOptional? }
  Response: { event: Event }

PATCH  /api/events/:id
  Body: Partial<Event>
  Response: { event: Event }

DELETE /api/events/:id
  Response: { success: boolean }

POST   /api/events/:id/restore
  Response: { event: Event }
```

#### Accommodations

```
GET    /api/trips/:tripId/accommodations
  Response: { accommodations: Accommodation[] }

POST   /api/trips/:tripId/accommodations
  Body: { name, address?, checkInDate, checkOutDate?, description?, links? }
  Response: { accommodation: Accommodation }

PATCH  /api/accommodations/:id
  Body: Partial<Accommodation>
  Response: { accommodation: Accommodation }

DELETE /api/accommodations/:id
  Response: { success: boolean }
```

#### Member Travel (Arrivals/Departures)

```
GET    /api/trips/:tripId/travel
  Response: { travel: Travel[] }

POST   /api/trips/:tripId/travel
  Body: { memberId, travelType, date, departingFrom?, departureTime?, arrivingAt?, arrivalTime?, travelMethod?, details?, links? }
  Response: { travel: Travel }

PATCH  /api/travel/:id
  Body: Partial<Travel>
  Response: { travel: Travel }

DELETE /api/travel/:id
  Response: { success: boolean }
```

### API Conventions

**Response Format**

```typescript
// Success
{
  success: true,
  data: { ... },
  message?: string
}

// Error
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | ...,
    message: string,
    details?: any
  }
}
```

**Pagination** (future)

```typescript
{
  data: [...],
  pagination: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}
```

**Error Codes**

- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Duplicate or conflicting data
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Authentication Flow

### Phone Verification Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────────┐
│  Client  │                    │   API    │                    │  Database    │
│          │                    │          │                    │ (PostgreSQL) │
└────┬─────┘                    └────┬─────┘                    └──────┬───────┘
     │                               │                                  │
     │ 1. POST /auth/request-code    │                                  │
     │ { phoneNumber }                │                                  │
     ├──────────────────────────────►│                                  │
     │                               │                                  │
     │                               │ 2. Generate 6-digit code         │
     │                               │    Store in verification_codes   │
     │                               │    table (5min expiry)           │
     │                               ├─────────────────────────────────►│
     │                               │                                  │
     │                               │ 3. Send SMS (mock console log)   │
     │                               │                                  │
     │ 4. { success: true }          │                                  │
     │◄──────────────────────────────┤                                  │
     │                               │                                  │
     │ 5. User enters code           │                                  │
     │                               │                                  │
     │ 6. POST /auth/verify-code     │                                  │
     │ { phoneNumber, code }          │                                  │
     ├──────────────────────────────►│                                  │
     │                               │                                  │
     │                               │ 7. Verify code from database     │
     │                               │    Check expiry timestamp        │
     │                               ├─────────────────────────────────►│
     │                               │◄─────────────────────────────────┤
     │                               │                                  │
     │                               │ 8. Create/fetch user             │
     │                               │    Generate JWT token            │
     │                               │    Delete code from database     │
     │                               │                                  │
     │ 9. { token, user }            │                                  │
     │◄──────────────────────────────┤                                  │
     │                               │                                  │
     │ 10. Store token in cookie     │                                  │
     │     (httpOnly, secure)        │                                  │
     │                               │                                  │

Note: For MVP, verification codes are stored in the database with expiry timestamps.
This eliminates the need for in-memory storage or Redis for simple verification flows.
```

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string; // User ID
  phone: string; // Phone number (for quick lookups)
  iat: number; // Issued at
  exp: number; // Expires at (7 days)
}
```

### Authentication Middleware

```typescript
// src/middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing authentication token',
        },
      });
    }

    const decoded = await request.server.jwt.verify<JWTPayload>(token);

    // Attach user to request
    request.user = {
      id: decoded.sub,
      phoneNumber: decoded.phone,
    };
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}
```

---

## Key Features Implementation

### 1. Timezone Handling

**Strategy:**

- Store all dates/times in UTC in the database
- Each trip has a `preferredTimezone` field (IANA timezone identifier)
- Users can toggle between trip timezone and their local timezone in UI

**Implementation:**

```typescript
// Backend: Save times in UTC
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

function convertToUTC(dateTime: Date, timezone: string): Date {
  return zonedTimeToUtc(dateTime, timezone)
}

// Frontend: Display in trip timezone or user timezone
import { formatInTimeZone } from 'date-fns-tz'

function formatEventTime(
  utcDateTime: Date,
  displayTimezone: string,
  format: string = 'h:mm a'
): string {
  return formatInTimeZone(utcDateTime, displayTimezone, format)
}

// Example usage in component
function EventCard({ event, trip, userTimezone, showInLocalTime }) {
  const displayTimezone = showInLocalTime ? userTimezone : trip.preferredTimezone
  const timeStr = formatEventTime(event.startTime, displayTimezone)

  return <div>{timeStr}</div>
}
```

### 2. Soft Delete Pattern

**Implementation:**

```typescript
// Soft delete event
async function deleteEvent(eventId: string, userId: string) {
  await db
    .update(events)
    .set({
      deletedAt: new Date(),
      deletedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));
}

// Restore event
async function restoreEvent(eventId: string) {
  await db
    .update(events)
    .set({
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));
}

// Query non-deleted events
const activeEvents = await db
  .select()
  .from(events)
  .where(and(eq(events.tripId, tripId), isNull(events.deletedAt)));

// Organizers can view deleted items
const deletedEvents = await db
  .select()
  .from(events)
  .where(and(eq(events.tripId, tripId), isNotNull(events.deletedAt)));
```

### 3. Permission System

**Permission Matrix:**

| Action                     | Member (Going) | Member (Not Going) | Organizer |
| -------------------------- | -------------- | ------------------ | --------- |
| View itinerary             | ✓              | ✗                  | ✓         |
| Add event                  | ✓\*            | ✗                  | ✓         |
| Edit own event             | ✓              | ✗                  | ✓         |
| Delete own event           | ✓              | ✗                  | ✓         |
| Edit any event             | ✗              | ✗                  | ✓         |
| Delete any event           | ✗              | ✗                  | ✓         |
| Add accommodation          | ✗              | ✗                  | ✓         |
| Add member travel (self)   | ✓              | ✗                  | ✓         |
| Add member travel (others) | ✗              | ✗                  | ✓         |
| Edit trip                  | ✗              | ✗                  | ✓         |
| Invite members             | ✗              | ✗                  | ✓         |

\*Only if trip setting `allowMembersToAddEvents` is enabled

### 4. Optimistic Updates

**TanStack Query Implementation:**

```typescript
// hooks/useTripEvents.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAddEvent(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newEvent: NewEvent) => api.events.create(tripId, newEvent),

    // Optimistic update
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events', tripId] });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData(['events', tripId]);

      // Optimistically update
      queryClient.setQueryData(['events', tripId], (old: Event[]) => [
        ...old,
        { ...newEvent, id: 'temp-id', createdAt: new Date() },
      ]);

      return { previousEvents };
    },

    // Rollback on error
    onError: (err, newEvent, context) => {
      queryClient.setQueryData(['events', tripId], context.previousEvents);
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', tripId] });
    },
  });
}
```

### 5. Multi-Day Events

**Display Strategy:**

- Events with `endDate` different from `startDate` appear once on the start date
- Show "Multi-day" badge with date range (e.g., "Oct 12-14")
- Do NOT duplicate across each day

**Query Implementation:**

```typescript
// Group events by day, handling multi-day events
function groupEventsByDay(events: Event[]) {
  const grouped = new Map<string, Event[]>();

  events.forEach((event) => {
    // Multi-day events only appear on start date
    const dateKey = format(event.startDate, 'yyyy-MM-dd');

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });

  return grouped;
}
```

---

## Development Practices

### Monorepo Structure

```
tripful/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Fastify backend
├── shared/               # Shared types and utilities (no packages nesting)
│   ├── types/
│   ├── schemas/          # Zod schemas (shared validation)
│   └── utils/
├── docs/
│   └── 2026-02-01-tripful-mvp/
│       ├── PRD.md
│       ├── DESIGN.md
│       └── ARCHITECTURE.md (this file)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── .env.example
```

**Note:** `shared` is at the root level for simplicity. No need to nest under `packages` for MVP.

### Environment Variables

**Backend (.env.api)**

```bash
# Server
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tripful

# JWT
JWT_SECRET=your-secret-key-change-in-production

# SMS (Future - Twilio)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=

# Storage (Future - AWS S3)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
# AWS_REGION=

# Caching (Future - Redis)
# REDIS_URL=redis://localhost:6379
```

**Frontend (.env.web)**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Development Workflow

1. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```
2. **Run migrations**
   ```bash
   cd apps/api
   pnpm db:migrate
   pnpm db:seed
   ```
3. **Start development servers**

   ```bash
   # Root directory
   pnpm dev

   # Or individually
   pnpm --filter web dev
   pnpm --filter api dev
   ```

### Code Quality

**TypeScript Configuration**

- TypeScript 5.9.x (latest)
- Strict mode enabled
- Target: ES2023 for Node.js 22
- Module: "nodenext" for modern module resolution
- Shared `tsconfig.base.json` for consistency
- Path aliases for clean imports

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  }
}
```

**Shared Package Module Resolution**

The `@tripful/shared` package uses a specific import pattern to support Next.js transpilation:

- **No file extensions** in import paths (e.g., `from './types/index'` instead of `from './types/index.js'`)
- This is required for Next.js's `transpilePackages` feature to work correctly
- TypeScript's `moduleResolution: "nodenext"` typically requires `.js` extensions, but Next.js cannot resolve these when importing from TypeScript source files
- TypeScript will show warnings (TS2835) about missing extensions - these are cosmetic and can be ignored

**Example:**
```typescript
// ✅ Correct (compatible with Next.js)
export { User } from './types/index';

// ❌ Breaks Next.js module resolution
export { User } from './types/index.js';
```

See `shared/README.md` for detailed guidance on adding new exports.

**Linting**

- ESLint 9.x with flat config (`eslint.config.js`)
- `@eslint/js` for recommended configs
- TypeScript ESLint plugin for type-aware linting

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
```

**Scripts**

```bash
pnpm lint       # ESLint
pnpm typecheck  # TypeScript
```

**Git Hooks (Husky)**

- Pre-commit: Lint staged files, typecheck
- Pre-push: Run unit tests

---

## Testing Strategy

### Unit Tests (Vitest)

**Backend Services**

```typescript
// tests/unit/services/permissions.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionsService } from '@/services/permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    service = new PermissionsService();
  });

  it('should allow organizer to add events', async () => {
    const canAdd = await service.canAddEvent('organizer-id', 'trip-id');
    expect(canAdd).toBe(true);
  });

  it('should prevent non-going member from adding events', async () => {
    const canAdd = await service.canAddEvent('member-id', 'trip-id');
    expect(canAdd).toBe(false);
  });
});
```

**Frontend Hooks**

```typescript
// tests/unit/hooks/useTripEvents.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTripEvents } from '@/hooks/useTripEvents'

describe('useTripEvents', () => {
  it('should fetch trip events', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useTripEvents('trip-id'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(3)
  })
})
```

### Integration Tests (Vitest + Supertest)

```typescript
// tests/integration/trips.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/server';

describe('Trips API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup test database and authenticate
    const res = await request(app.server)
      .post('/api/auth/verify-code')
      .send({ phoneNumber: '+15551234567', code: '123456' });

    authToken = res.body.token;
  });

  it('should create a new trip', async () => {
    const res = await request(app.server)
      .post('/api/trips')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Trip',
        destination: 'Miami',
        preferredTimezone: 'America/New_York',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.trip).toHaveProperty('id');
    expect(res.body.data.trip.name).toBe('Test Trip');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/trip-creation.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a trip and invite members', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="phoneNumber"]', '+15551234567');
  await page.click('button[type="submit"]');

  // Enter verification code (mocked in test environment)
  await page.fill('[name="code"]', '123456');
  await page.click('button:has-text("Verify")');

  // Create trip
  await page.goto('/create-trip');
  await page.fill('[name="name"]', 'Bachelor Party Weekend');
  await page.fill('[name="destination"]', 'Miami Beach, FL');
  await page.click('button:has-text("Create Trip")');

  // Verify trip was created
  await expect(page).toHaveURL(/\/trips\/[a-f0-9-]+/);
  await expect(page.locator('h1')).toContainText('Bachelor Party Weekend');

  // Invite members
  await page.click('button:has-text("Invite Members")');
  await page.fill('[name="phoneNumbers"]', '+15559876543');
  await page.click('button:has-text("Send Invitations")');

  await expect(page.locator('.toast')).toContainText('Invitations sent');
});
```

### Test Coverage Goals & Strategy

**Backend Testing:**

- Unit tests colocated with services (`service.ts` + `service.test.ts`)
- Focus on business logic and edge cases
- Target: 70%+ coverage for services
- Integration tests for all API endpoints

**Frontend Testing:**

- Focus on **integration tests** over unit tests
- Avoid over-testing individual components
- Test **core workflows** end-to-end
- Use Playwright for critical user journeys

**Test Organization:**

```
apps/api/src/
├── services/
│   ├── auth.service.ts
│   ├── auth.service.test.ts      # Colocated unit tests
│   ├── trips.service.ts
│   └── trips.service.test.ts

apps/web/
├── app/
│   └── trips/
│       └── __tests__/            # Integration tests for workflows
│           └── create-trip.test.tsx
```

**Priority:**

1. E2E tests for critical flows (auth, trip creation, RSVP, event management)
2. Backend integration tests (API endpoints)
3. Backend unit tests (services with complex logic)
4. Frontend integration tests (multi-component workflows)
5. Frontend unit tests (only for complex utilities)

---

## Security Considerations

### 1. Authentication Security

- **JWT Tokens**: Signed with strong secret, 7-day expiration
- **Refresh Strategy**: New token on each request (optional)
- **Cookie Storage**: `httpOnly`, `secure`, `sameSite: strict`
- **Rate Limiting**: 5 attempts per phone number per hour for SMS codes

### 2. Authorization

- **Trip Access**: Verify phone number in invitations table before showing preview
- **Event Permissions**: Check RSVP status and organizer role
- **Resource Ownership**: Validate user owns resource before updates

### 3. Input Validation

- **Zod Schemas**: Shared between frontend and backend
- **Sanitization**: Strip HTML/scripts from text inputs
- **File Uploads**: Validate MIME types, file size limits (5MB)

```typescript
// Shared validation schema
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  startDate: z.string().date(),
  startTime: z.string().time().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  links: z.array(z.string().url()).max(10).optional(),
});
```

### 4. Data Privacy

- **Phone Numbers**: Hashed in database (but kept readable for SMS)
- **PII Protection**: Minimal data collection, no tracking
- **Soft Delete**: Data retained but marked deleted (GDPR consideration)

### 5. SQL Injection Prevention

- **Drizzle ORM**: Parameterized queries by default
- **No Raw SQL**: Avoid `.sql` unless necessary and carefully reviewed

### 6. CORS Configuration

```typescript
fastify.register(cors, {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

### 7. Rate Limiting

```typescript
// Global rate limit
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
});

// SMS endpoint rate limit (stricter)
fastify.register(rateLimit, {
  max: 5,
  timeWindow: '1 hour',
  keyGenerator: (req) => req.body.phoneNumber,
});
```

---

## Performance Considerations

### 1. Database Optimization

**Indexes**

```sql
CREATE INDEX idx_events_trip_date ON events(trip_id, start_date);
CREATE INDEX idx_members_user_trip ON members(user_id, trip_id);
CREATE INDEX idx_invitations_phone ON invitations(invitee_phone_number);
CREATE INDEX idx_verification_codes_expiry ON verification_codes(expires_at);
```

**Query Optimization**

- Use Drizzle's `leftJoin` for related data in single query
- Limit results with `.limit()` and `.offset()`
- Select only needed columns with `.select({ ... })`

### 2. Caching Strategy

**Database-Based Verification Codes (MVP)**

For MVP, verification codes are stored directly in the database with expiry timestamps:

```typescript
// Database verification code service
class VerificationCodeService {
  async set(phoneNumber: string, code: string, ttlMinutes: number = 5) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await db
      .insert(verificationCodes)
      .values({
        phoneNumber,
        code,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: verificationCodes.phoneNumber,
        set: { code, expiresAt, createdAt: new Date() },
      });
  }

  async get(phoneNumber: string): Promise<string | null> {
    const result = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber))
      .limit(1);

    if (!result[0]) return null;

    // Check expiry
    if (new Date() > result[0].expiresAt) {
      await this.delete(phoneNumber);
      return null;
    }

    return result[0].code;
  }

  async delete(phoneNumber: string) {
    await db.delete(verificationCodes).where(eq(verificationCodes.phoneNumber, phoneNumber));
  }
}
```

**Benefits:**

- No need for Redis or in-memory storage in MVP
- Automatic cleanup via periodic job or trigger
- Persists across server restarts
- Simpler deployment

**Production:** Consider Redis for high-volume scenarios and distributed caching.

**TanStack Query Caching** (Frontend)

- `staleTime: 60000` (1 minute) - Consider data fresh
- `gcTime: 300000` (5 minutes) - Cache persists in background
- Automatic background refetching on window focus

### 3. Next.js Optimizations

**React Server Components**

- Initial page loads with pre-rendered content
- Reduced client JavaScript bundle
- Streaming SSR for faster Time to First Byte (TTFB)

**Image Optimization**

```tsx
import Image from 'next/image';

<Image src={trip.coverImageUrl} alt={trip.name} width={800} height={400} priority={false} />;
```

**Code Splitting**

- Automatic route-based splitting
- Dynamic imports for modals and heavy components

```tsx
import dynamic from 'next/dynamic';

const EventFormModal = dynamic(() => import('@/components/EventFormModal'), {
  ssr: false,
  loading: () => <Spinner />,
});
```

### 4. API Response Times

**Goals:**

- GET endpoints: <200ms (p95)
- POST/PATCH endpoints: <500ms (p95)
- File uploads: <2s (p95)

**Optimization Techniques:**

- Connection pooling for PostgreSQL
- Redis for session storage (not database)
- Compress responses with `@fastify/compress`

```typescript
fastify.register(compress, {
  encodings: ['gzip', 'deflate'],
});
```

### 5. Frontend Performance

**Bundle Size**

- Target: <200KB initial JS bundle (gzipped)
- Use tree-shaking for unused code
- Lazy load routes and components

**Rendering Performance**

- Use `React.memo` for expensive list items
- Virtualize long event lists (future: `react-window`)
- Debounce search/filter inputs

---

## Appendix

### Technology Version Summary

| Technology     | Version | Notes                            |
| -------------- | ------- | -------------------------------- |
| Next.js        | 16.x    | Latest with App Router           |
| React          | 19.x    | Latest stable                    |
| TypeScript     | 5.9.x   | Latest (target: ES2023)          |
| Fastify        | 5.x     | Latest v5                        |
| Drizzle ORM    | 0.36+   | Latest with improved types       |
| TanStack Query | 5.x     | React Query v5                   |
| PostgreSQL     | 16+     | Latest stable                    |
| Node.js        | 22.x    | LTS                              |
| ESLint         | 9.x     | Flat config                      |
| shadcn/ui      | Latest  | Copy-paste components (Radix UI) |

### Development Timeline Estimate (Feature-Based)

**Phase 1: Project Setup & Infrastructure (Week 1)**

- Monorepo setup (pnpm workspaces, Turbo)
- Backend: Fastify server, Drizzle ORM, PostgreSQL connection
- Frontend: Next.js App Router, Tailwind CSS, shadcn/ui setup
- Shared: Zod schemas, TypeScript configs, ESLint 9 flat config
- Docker Compose for PostgreSQL

**Phase 2: Authentication Feature (Week 1-2)**

- Backend: Phone verification endpoints, JWT generation, mock SMS service
- Frontend: Login/verify pages, auth context, protected routes
- Shared: Auth schemas, JWT types
- E2E test: User can log in with phone number

**Phase 3: Trip Management (Week 2-3)**

- Backend: Trip CRUD endpoints, organizer management, permissions service
- Frontend: Dashboard, create trip dialog (shadcn), trip detail page
- Shared: Trip schemas, permission types
- E2E test: User can create and view trips

**Phase 4: Invitations & RSVP (Week 3-4)**

- Backend: Invitation endpoints, RSVP management, partial preview logic
- Frontend: Invite members dialog, RSVP buttons, member list
- Shared: RSVP schemas
- E2E test: User can invite members and RSVP to trips

**Phase 5: Itinerary Events (Week 4-5)**

- Backend: Events CRUD, event types, permission checks
- Frontend: Event creation dialog, event list, day-by-day view, timezone toggle
- Shared: Event schemas, timezone utilities
- E2E test: User can add/edit/delete events

**Phase 6: Accommodations & Member Travel (Week 5-6)**

- Backend: Accommodations/travel CRUD, organizer-only restrictions
- Frontend: Add accommodation dialog, add travel dialog, compact view/expand
- Shared: Accommodation/travel schemas
- E2E test: Organizer can add accommodations, members can add their travel

**Phase 7: Advanced Itinerary Features (Week 6)**

- Backend: Soft delete, restore, multi-day events
- Frontend: Group by type view, deleted items (organizers), multi-day badges
- E2E test: Organizer can restore deleted events

**Phase 8: Polish & Testing (Week 7-8)**

- Error handling and validation
- Loading states and optimistic updates
- Responsive design refinements
- Performance optimization (query optimization, caching strategy)
- Unit tests for complex services
- Integration tests for all API endpoints
- E2E tests for all critical flows
- Documentation

### Future Enhancements (Post-MVP)

**Phase 2 Features:**

- Rich text editor for descriptions
- Map integration for locations
- Search and filtering
- Notification center UI
- Per-event RSVP tracking

**Advanced Features:**

- Cost tracking and split payments
- Comments and discussion threads
- Photo sharing per event
- Calendar export (iCal, Google Calendar)
- Trip templates
- Packing lists
- Weather integration

---

## References

- [PRD.md](./PRD.md) - Product Requirements Document
- [DESIGN.md](./DESIGN.md) - UI/UX Design Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://fastify.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Document Version**: 1.1
**Last Updated**: 2026-02-01
**Status**: MVP Architecture - Core Flows Implemented
**Key Updates**:

- Renamed `rsvps` table to `members` with proper ID primary key
- Changed verification codes from in-memory to database-backed storage
- Added comprehensive schema definitions for all tables
- Noted that core flows have been implemented in demo
