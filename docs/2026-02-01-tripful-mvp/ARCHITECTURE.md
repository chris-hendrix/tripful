---
date: 2026-02-01
topic: Tripful - High-Level Architecture Document (v1)
status: Phase 1-3 Complete - Monorepo + Auth + Trip Management
last_updated: 2026-02-06
---

# Tripful - High-Level Architecture

> **Implementation Status**:
>
> - ✅ **Phase 1 Complete**: Monorepo setup with pnpm + Turbo + TypeScript
> - ✅ **Phase 2 Complete**: SMS authentication with full E2E testing
> - ✅ **Phase 3 Complete**: Trip management with CRUD, permissions, co-organizers, and image uploads
> - 🚧 **Phase 4-8**: Pending (Invitations, itinerary features, advanced features)
>
> This document reflects the current production implementation and planned architecture.

## Implementation Progress

### ✅ Phase 1: Monorepo Setup (Complete)

**Git Commit**: `faeb16c - Phase 1: Monorepo Setup with pnpm + Turbo + TypeScript`

- [x] pnpm workspace configuration with 3 packages (@tripful/api, @tripful/web, @tripful/shared)
- [x] Turbo build orchestration with parallel task execution
- [x] TypeScript 5.7.3 strict mode across all workspaces
- [x] Shared tsconfig.base.json for consistent configuration
- [x] PostgreSQL 16 via Docker Compose (port 5433)
- [x] Drizzle ORM 0.36.4 with schema-first approach
- [x] ESLint + Prettier configuration
- [x] Development scripts for parallel dev servers

### ✅ Phase 2: SMS Authentication (Complete)

**Git Commit**: `1fe5e5e - Phase 2: SMS Authentication with E2E Testing`

**Backend (Fastify):**

- [x] Phone-based authentication with SMS verification codes
- [x] JWT token generation with httpOnly cookies
- [x] Database-backed verification codes (5-minute expiry)
- [x] Rate limiting (5 SMS requests/hour per phone number)
- [x] libphonenumber-js for E.164 phone validation
- [x] Auth middleware with protected routes
- [x] Profile completion flow (displayName + timezone)
- [x] Mock SMS service (console logging for dev/test)
- [x] Comprehensive unit tests (8 test files, all passing)
- [x] Integration tests for all auth endpoints

**Frontend (Next.js 16):**

- [x] Login page with phone number input
- [x] Verification page with 6-digit code entry
- [x] Complete profile page with timezone selection
- [x] Protected dashboard route
- [x] AuthProvider context for global auth state
- [x] Radix UI + shadcn/ui components
- [x] TanStack Query for API state management

**Database Schema:**

- [x] users table (id, phone_number, display_name, timezone, profile_photo_url)
- [x] verification_codes table (phone_number PK, code, expires_at)
- [x] Indexes for phone_number and expires_at
- [x] Migration: `0000_smooth_sharon_ventura.sql`

**E2E Testing (Playwright):**

- [x] Complete authentication journey (login → verify → profile → dashboard)
- [x] Logout flow with cookie cleanup
- [x] Protected route access control
- [x] Existing user skip profile flow
- [x] All tests passing with sequential execution

### ✅ Phase 3: Trip Management (Complete)

**Git Commit**: `2c31b4f - Ralph: Task 30 - Task 7.3: Code review and cleanup`

**Backend (Fastify):**

- [x] Trip CRUD operations (create, read, update, delete/cancel)
- [x] List user's trips with role information (organizer/member)
- [x] Co-organizer management (add/remove)
- [x] Permission service for access control
- [x] Image upload service for trip cover images
- [x] File storage with validation (JPEG/PNG/WebP, max 5MB)
- [x] Comprehensive unit tests for services
- [x] Integration tests for all trip endpoints

**Frontend (Next.js 16):**

- [x] Dashboard with trip list and search functionality
- [x] Trip grouping (Your Trips, Other Trips, Past Trips)
- [x] CreateTripDialog with 2-step form (details + optional cover image)
- [x] EditTripDialog with tabbed interface (Details, Settings, Cover Image, Delete)
- [x] Trip detail page with full information display
- [x] TripCard component for list display
- [x] ImageUpload component with drag-and-drop
- [x] Permission-based UI rendering

**Database Schema:**

- [x] trips table (name, destination, dates, timezone, cover_image_url, settings)
- [x] organizers table (many-to-many relationship)
- [x] Migration: `0001_trip_management.sql`

**E2E Testing (Playwright):**

- [x] Trip creation flow (2-step form)
- [x] Trip editing flow (all tabs)
- [x] Permission system tests
- [x] Co-organizer management tests
- [x] All tests passing (902 lines, 4 test suites)

**API Endpoints Implemented:**

- `GET /api/trips` - List user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Cancel trip
- `POST /api/trips/:id/co-organizers` - Add co-organizer
- `DELETE /api/trips/:id/co-organizers/:userId` - Remove co-organizer
- `POST /api/trips/:id/cover-image` - Upload cover image
- `DELETE /api/trips/:id/cover-image` - Delete cover image

### 🚧 Phase 4-8: Remaining Features (Planned)

- [ ] Invitations and RSVP system (Phase 4)
- [ ] Event creation and itinerary views (Phase 5)
- [ ] Accommodations and member travel (Phase 6)
- [ ] Advanced itinerary features (soft delete, multi-day) (Phase 7)
- [ ] Polish, validation, and performance optimization (Phase 8)

---

## Table of Contents

1. [Implementation Progress](#implementation-progress)
2. [System Overview](#system-overview)
3. [Architecture Diagram](#architecture-diagram)
4. [Technology Stack](#technology-stack)
5. [System Components](#system-components)
6. [Data Model](#data-model)
7. [API Design](#api-design)
8. [Authentication Flow](#authentication-flow)
9. [Key Features Implementation](#key-features-implementation)
10. [Development Practices](#development-practices)
11. [Testing Strategy](#testing-strategy)
12. [Security Considerations](#security-considerations)
13. [Performance Considerations](#performance-considerations)

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
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: {
    expiresIn: "7d",
  },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

// Routes
await fastify.register(authRoutes, { prefix: "/api/auth" });
await fastify.register(tripsRoutes, { prefix: "/api/trips" });
await fastify.register(eventsRoutes, { prefix: "/api/events" });
// ... other routes

const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 8000,
      host: "0.0.0.0",
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
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
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
import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Verification Codes Table**

```typescript
// src/db/schema/verification_codes.ts
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const verificationCodes = pgTable("verification_codes", {
  phoneNumber: varchar("phone_number", { length: 20 }).primaryKey(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
```

**Members Table (trip membership and RSVP status)**

```typescript
// src/db/schema/members.ts
import { pgTable, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { trips, users } from ".";

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "not_going",
  "maybe",
  "no_response",
]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: rsvpStatusEnum("status").notNull().default("no_response"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
```

**Note:** The `members` table represents trip membership and RSVP status. When a user is invited, a member record is created with status `no_response`. This table serves dual purpose: membership tracking and response status.

**Trips Table**

```typescript
// src/db/schema/trips.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  destination: text("destination").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  preferredTimezone: varchar("preferred_timezone", { length: 100 }).notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  allowMembersToAddEvents: boolean("allow_members_to_add_events")
    .notNull()
    .default(true),
  cancelled: boolean("cancelled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
} from "drizzle-orm/pg-core";
import { trips, users } from ".";

export const eventTypeEnum = pgEnum("event_type", [
  "travel",
  "meal",
  "activity",
]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  eventType: eventTypeEnum("event_type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  allDay: boolean("all_day").notNull().default(false),
  location: varchar("location", { length: 500 }),
  meetupLocation: varchar("meetup_location", { length: 200 }),
  meetupTime: time("meetup_time"),
  description: text("description"),
  links: text("links").array(),
  isOptional: boolean("is_optional").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

**Accommodations Table**

```typescript
// src/db/schema/accommodations.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { trips } from ".";

export const accommodations = pgTable("accommodations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  description: text("description"),
  links: text("links").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Accommodation = typeof accommodations.$inferSelect;
export type NewAccommodation = typeof accommodations.$inferInsert;
```

**Travel Table (member arrivals/departures)**

```typescript
// src/db/schema/travel.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  time,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { trips, members } from ".";

export const travelTypeEnum = pgEnum("travel_type", ["arrival", "departure"]);

export const travel = pgTable("travel", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  travelType: travelTypeEnum("travel_type").notNull(),
  date: date("date").notNull(),
  departingFrom: varchar("departing_from", { length: 200 }),
  departureTime: time("departure_time"),
  arrivingAt: varchar("arriving_at", { length: 200 }),
  arrivalTime: time("arrival_time"),
  travelMethod: varchar("travel_method", { length: 100 }),
  details: text("details"),
  links: text("links").array(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Travel = typeof travel.$inferSelect;
export type NewTravel = typeof travel.$inferInsert;
```

#### Relationships Definition

```typescript
// src/db/schema/index.ts
import { relations } from "drizzle-orm";
import * as schema from ".";

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
import { db } from "@/config/database";
import { trips, events, users } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  sendInvitation(
    phoneNumber: string,
    tripName: string,
    tripLink: string,
  ): Promise<void>;
  sendTripUpdate(phoneNumber: string, message: string): Promise<void>;
  sendCancellation(phoneNumber: string, tripName: string): Promise<void>;
}

// Mock implementation for MVP
export class MockSMSService implements ISMSService {
  async sendVerificationCode(phoneNumber: string, code: string) {
    console.log(`[MOCK SMS] Verification code for ${phoneNumber}: ${code}`);
    // In development: Also log to a file or display in UI
  }

  async sendInvitation(
    phoneNumber: string,
    tripName: string,
    tripLink: string,
  ) {
    console.log(`[MOCK SMS] Invitation to ${phoneNumber}:`);
    console.log(`You've been invited to ${tripName}! ${tripLink}`);
  }

  async sendTripUpdate(phoneNumber: string, message: string) {
    console.log(`[MOCK SMS] Trip update to ${phoneNumber}: ${message}`);
  }

  async sendCancellation(phoneNumber: string, tripName: string) {
    console.log(
      `[MOCK SMS] Cancellation to ${phoneNumber}: ${tripName} has been cancelled`,
    );
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
    const fileId = url.split("/").pop()!;
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
        and(
          eq(members.userId, userId),
          eq(members.tripId, tripId),
          eq(members.status, "going"),
        ),
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
            eq(members.status, "going"),
          ),
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

#### Authentication (✅ Implemented)

**File:** `apps/api/src/routes/auth.routes.ts`

**1. Request Verification Code**

```http
POST /api/auth/request-code

Request:
  Content-Type: application/json
  {
    "phoneNumber": "5551234567"  // 10-20 digits
  }

Response (200):
  {
    "success": true,
    "message": "Verification code sent to +15551234567"
  }

Response (400 - Validation Error):
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Phone number must be between 10 and 20 characters"
    }
  }

Response (429 - Rate Limited):
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests. Please try again in 60 minutes."
    }
  }

Rate Limit: 5 requests per phone number per hour
Phone Format: Converted to E.164 (+15551234567) using libphonenumber-js
Code Expiry: 5 minutes
Dev/Test: Fixed code "123456" | Production: Random 6-digit code
```

**2. Verify Code and Login**

```http
POST /api/auth/verify-code

Request:
  Content-Type: application/json
  {
    "phoneNumber": "5551234567",
    "code": "123456"
  }

Response (200 - New User):
  Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict
  {
    "success": true,
    "user": {
      "id": "uuid",
      "phoneNumber": "+15551234567",
      "displayName": "",
      "timezone": "UTC",
      "profilePhotoUrl": null,
      "createdAt": "2026-02-04T...",
      "updatedAt": "2026-02-04T..."
    },
    "requiresProfile": true
  }

Response (200 - Existing User):
  Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Strict
  {
    "success": true,
    "user": { /* ... with displayName */ },
    "requiresProfile": false
  }

Response (400 - Invalid Code):
  {
    "success": false,
    "error": {
      "code": "INVALID_CODE",
      "message": "Invalid or expired verification code"
    }
  }

JWT Payload: { sub, phone, name, iat, exp }
Expiry: 7 days
```

**3. Complete Profile**

```http
POST /api/auth/complete-profile
Authentication: Required (JWT in cookie or Authorization header)

Request:
  {
    "displayName": "John Doe",   // 3-50 characters
    "timezone": "America/New_York"  // Optional, IANA timezone
  }

Response (200):
  Set-Cookie: auth_token=<new-jwt>; HttpOnly; Secure; SameSite=Strict
  {
    "success": true,
    "user": {
      "id": "uuid",
      "phoneNumber": "+15551234567",
      "displayName": "John Doe",
      "timezone": "America/New_York",
      /* ... */
    }
  }

Response (401 - Not Authenticated):
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing authentication token"
    }
  }
```

**4. Get Current User**

```http
GET /api/auth/me
Authentication: Required

Response (200):
  {
    "success": true,
    "user": {
      "id": "uuid",
      "phoneNumber": "+15551234567",
      "displayName": "John Doe",
      "timezone": "America/New_York",
      "profilePhotoUrl": null,
      "createdAt": "2026-02-04T...",
      "updatedAt": "2026-02-04T..."
    }
  }
```

**5. Logout**

```http
POST /api/auth/logout
Authentication: Required

Response (200):
  Set-Cookie: auth_token=; Max-Age=0  // Clears cookie
  {
    "success": true,
    "message": "Logged out successfully"
  }
```

---

#### Trips (✅ Implemented)

**File:** `apps/api/src/routes/trips.routes.ts`

**1. List User's Trips**

```http
GET /api/trips
Authentication: Required

Response (200):
  {
    "success": true,
    "data": {
      "trips": [
        {
          "id": "uuid",
          "name": "Summer Vacation",
          "destination": "Hawaii",
          "startDate": "2026-07-01",
          "endDate": "2026-07-10",
          "preferredTimezone": "Pacific/Honolulu",
          "description": "Beach vacation with friends",
          "coverImageUrl": "https://example.com/image.jpg",
          "allowMembersToAddEvents": true,
          "cancelled": false,
          "createdBy": "uuid",
          "createdAt": "2026-02-01T...",
          "updatedAt": "2026-02-01T...",
          "isOrganizer": true,
          "rsvpStatus": "going",
          "organizerInfo": [
            {
              "id": "uuid",
              "displayName": "John Doe",
              "profilePhotoUrl": null
            }
          ],
          "memberCount": 5,
          "eventCount": 12
        }
      ]
    }
  }

Additional Information:
  - Returns all trips where user is organizer or member
  - Includes role information (isOrganizer)
  - Includes RSVP status for member trips
  - Includes organizer list and counts
  - Ordered by start date (descending), then created date (descending)
```

**2. Get Trip Details**

```http
GET /api/trips/:id
Authentication: Required

Response (200):
  {
    "success": true,
    "data": {
      "trip": {
        "id": "uuid",
        "name": "Summer Vacation",
        "destination": "Hawaii",
        "startDate": "2026-07-01",
        "endDate": "2026-07-10",
        "preferredTimezone": "Pacific/Honolulu",
        "description": "Beach vacation with friends",
        "coverImageUrl": "https://example.com/image.jpg",
        "allowMembersToAddEvents": true,
        "cancelled": false,
        "createdBy": "uuid",
        "createdAt": "2026-02-01T...",
        "updatedAt": "2026-02-01T..."
      },
      "creator": {
        "id": "uuid",
        "displayName": "John Doe",
        "profilePhotoUrl": null
      },
      "organizers": [
        {
          "id": "uuid",
          "displayName": "John Doe",
          "profilePhotoUrl": null
        }
      ],
      "isOrganizer": true,
      "rsvpStatus": "going"
    }
  }

Response (404 - Not Found):
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Trip not found"
    }
  }

Response (403 - Forbidden):
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "You must be a member of this trip"
    }
  }

Authorization: User must be organizer or member of the trip
```

**3. Create Trip**

```http
POST /api/trips
Authentication: Required
Authorization: Complete profile required

Request:
  Content-Type: application/json
  {
    "name": "Summer Vacation",          // 3-100 characters
    "destination": "Hawaii",            // 3-500 characters
    "startDate": "2026-07-01",         // Optional, ISO date (YYYY-MM-DD)
    "endDate": "2026-07-10",           // Optional, ISO date (YYYY-MM-DD)
    "preferredTimezone": "Pacific/Honolulu",  // IANA timezone identifier
    "description": "Beach vacation",    // Optional, max 2000 characters
    "allowMembersToAddEvents": true    // Optional, default: true
  }

Response (201):
  {
    "success": true,
    "data": {
      "trip": {
        "id": "uuid",
        "name": "Summer Vacation",
        /* ... full trip object */
      }
    }
  }

Response (400 - Validation Error):
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Trip name must be between 3 and 100 characters"
    }
  }

Additional Information:
  - Creator automatically becomes organizer
  - Creator automatically becomes member with "going" status
  - endDate must be >= startDate if both provided
```

**4. Update Trip**

```http
PUT /api/trips/:id
Authentication: Required
Authorization: Must be organizer

Request:
  Content-Type: application/json
  {
    "name": "Updated Trip Name",       // Optional
    "destination": "Updated Location", // Optional
    "startDate": "2026-07-15",        // Optional
    "endDate": "2026-07-20",          // Optional
    "preferredTimezone": "America/New_York",  // Optional
    "description": "Updated description",     // Optional
    "allowMembersToAddEvents": false  // Optional
  }

Response (200):
  {
    "success": true,
    "data": {
      "trip": {
        /* ... updated trip object */
      }
    }
  }

Response (403 - Forbidden):
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Only organizers can update trip details"
    }
  }

Additional Information:
  - Only provided fields are updated
  - Validates dates if both provided
  - Updates updatedAt timestamp
```

**5. Cancel/Delete Trip**

```http
DELETE /api/trips/:id
Authentication: Required
Authorization: Must be organizer

Response (200):
  {
    "success": true,
    "message": "Trip cancelled successfully"
  }

Response (403 - Forbidden):
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Only organizers can cancel trips"
    }
  }

Additional Information:
  - Sets cancelled field to true (soft delete)
  - Trip still accessible but marked as cancelled
  - Does not delete related data (members, events, etc.)
```

**6. Add Co-Organizer**

```http
POST /api/trips/:id/co-organizers
Authentication: Required
Authorization: Must be organizer

Request:
  Content-Type: application/json
  {
    "phoneNumber": "+15551234567"  // E.164 format
  }

Response (200):
  {
    "success": true,
    "data": {
      "organizer": {
        "id": "uuid",
        "tripId": "uuid",
        "userId": "uuid",
        "createdAt": "2026-02-06T..."
      }
    }
  }

Response (400 - User Not Found):
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "User with phone number +15551234567 not found"
    }
  }

Response (409 - Already Organizer):
  {
    "success": false,
    "error": {
      "code": "CONFLICT",
      "message": "User is already an organizer"
    }
  }

Additional Information:
  - User must exist in system (registered)
  - Adds user as organizer if not already
  - Also adds as member with "going" status if not member
```

**7. Remove Co-Organizer**

```http
DELETE /api/trips/:id/co-organizers/:userId
Authentication: Required
Authorization: Must be organizer

Response (200):
  {
    "success": true,
    "message": "Co-organizer removed successfully"
  }

Response (400 - Cannot Remove Creator):
  {
    "success": false,
    "error": {
      "code": "FORBIDDEN",
      "message": "Cannot remove trip creator as organizer"
    }
  }

Response (404 - Not Organizer):
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "User is not an organizer of this trip"
    }
  }

Additional Information:
  - Cannot remove trip creator (createdBy user)
  - Removes organizer role but keeps as member
  - User remains member with their RSVP status
```

**8. Upload Cover Image**

```http
POST /api/trips/:id/cover-image
Authentication: Required
Authorization: Must be organizer
Content-Type: multipart/form-data

Request:
  Form Data:
    file: <image file>  // JPEG, PNG, or WebP, max 5MB

Response (200):
  {
    "success": true,
    "data": {
      "coverImageUrl": "/uploads/trip-uuid-timestamp.jpg"
    }
  }

Response (400 - File Too Large):
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "File size exceeds maximum of 5MB"
    }
  }

Response (400 - Invalid Type):
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid file type. Allowed: image/jpeg, image/png, image/webp"
    }
  }

Additional Information:
  - Deletes old cover image if exists
  - Stores in UPLOAD_DIR (default: uploads/)
  - File named: trip-{tripId}-{timestamp}.{ext}
  - Updates trip.coverImageUrl field
```

**9. Delete Cover Image**

```http
DELETE /api/trips/:id/cover-image
Authentication: Required
Authorization: Must be organizer

Response (200):
  {
    "success": true,
    "message": "Cover image deleted successfully"
  }

Response (404 - No Image):
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Trip has no cover image"
    }
  }

Additional Information:
  - Deletes file from filesystem
  - Sets trip.coverImageUrl to null
  - No error if file doesn't exist on filesystem
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

### JWT Token Structure (✅ Implemented)

**Token Payload** (generated by `apps/api/src/services/auth.service.ts`):

```typescript
interface JWTPayload {
  sub: string; // User ID (UUID)
  phone: string; // Phone number in E.164 format
  name: string; // Display name (empty if profile incomplete)
  iat: number; // Issued at timestamp
  exp: number; // Expires at (iat + 7 days)
}
```

**Signing Configuration** (`apps/api/src/server.ts`):

- Algorithm: HS256
- Secret: From JWT_SECRET env var (min 32 characters)
- Expiration: 7 days
- Stored in httpOnly cookie: `auth_token`
  - Path: `/`
  - SameSite: `strict`
  - Secure: `true` (production only)

### Authentication Middleware (✅ Implemented)

**File:** `apps/api/src/middleware/auth.middleware.ts`

#### 1. `authenticate()` Middleware

Validates JWT from cookie or Authorization header:

```typescript
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // Check cookie first, fallback to Authorization header
    const token =
      request.cookies.auth_token ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing authentication token",
        },
      });
    }

    // Verify JWT signature and expiry
    const decoded = await request.server.jwt.verify<JWTPayload>(token);

    // Attach user to request object
    request.user = {
      id: decoded.sub,
      phoneNumber: decoded.phone,
      displayName: decoded.name,
    };
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }
}
```

#### 2. `requireCompleteProfile()` Middleware

Ensures authenticated user has completed their profile:

```typescript
export async function requireCompleteProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Must have displayName to access protected features
  if (!request.user?.displayName || request.user.displayName.trim() === "") {
    return reply.status(403).send({
      success: false,
      error: {
        code: "PROFILE_INCOMPLETE",
        message: "Please complete your profile first",
      },
    });
  }
}
```

**Usage in Routes:**

```typescript
// Protected route requiring auth
fastify.get("/api/trips", { preHandler: authenticate }, tripsController.list);

// Protected route requiring complete profile
fastify.post(
  "/api/trips",
  { preHandler: [authenticate, requireCompleteProfile] },
  tripsController.create,
);
```

---

## Trip Management Flow

### Trip Creation and Management (✅ Implemented)

**Services Layer:**

1. **TripService** (`apps/api/src/services/trip.service.ts`)
   - CRUD operations for trips
   - List user's trips with role and RSVP information
   - Co-organizer management
   - Member and organizer tracking

2. **PermissionsService** (`apps/api/src/services/permissions.service.ts`)
   - Check if user is organizer
   - Check if user can perform specific actions
   - Enforce permission rules based on trip settings

3. **UploadService** (`apps/api/src/services/upload.service.ts`)
   - Handle file uploads with validation
   - Support for trip cover images
   - File size and MIME type validation
   - Cleanup of old files

**Database Schema:**

```typescript
// Trips table
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  destination: text("destination").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  preferredTimezone: varchar("preferred_timezone", { length: 100 }).notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  allowMembersToAddEvents: boolean("allow_members_to_add_events")
    .notNull()
    .default(true),
  cancelled: boolean("cancelled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Organizers table (many-to-many)
export const organizers = pgTable("organizers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Members table (includes RSVP status)
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: rsvpStatusEnum("status").notNull().default("no_response"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Permission Rules:**

1. **Organizer Actions** (must be organizer):
   - Update trip details (name, destination, dates, description)
   - Change trip settings (allowMembersToAddEvents)
   - Add/remove co-organizers
   - Upload/delete cover images
   - Cancel/delete trip

2. **Member Actions** (based on RSVP status and settings):
   - View trip details (any member)
   - Add events (if RSVP="going" AND trip allows OR is organizer)
   - Edit own events (if still RSVP="going")
   - Delete own events (if still RSVP="going")

3. **Trip Creator Special Rules**:
   - Cannot be removed as organizer
   - Always has full permissions

**Frontend Components:**

1. **Dashboard** (`apps/web/src/app/(app)/dashboard/page.tsx`)
   - Lists all user's trips grouped by status
   - Search functionality
   - Trip grouping: Your Trips, Other Trips, Past Trips
   - CreateTripDialog trigger button

2. **CreateTripDialog** (`apps/web/src/components/trip/create-trip-dialog.tsx`)
   - Two-step form:
     - Step 1: Basic info (name, destination, dates, timezone)
     - Step 2: Optional details (description, cover image)
   - Zod validation with inline errors
   - TanStack Query mutation for optimistic updates

3. **TripCard** (`apps/web/src/components/trip/trip-card.tsx`)
   - Displays trip summary with cover image
   - Shows RSVP status badge
   - Shows organizer badge if applicable
   - Displays organizer avatars (stacked, max 3)
   - Shows event count
   - Animated entrance with staggered delays

4. **Trip Detail Page** (`apps/web/src/app/(app)/trips/[id]/page.tsx`)
   - Full trip information display
   - EditTripDialog trigger (organizers only)
   - Future: Events list, accommodations, member travel

5. **EditTripDialog** (`apps/web/src/components/trip/edit-trip-dialog.tsx`)
   - Tabbed interface:
     - **Details**: Edit basic trip info
     - **Settings**: Manage permissions and co-organizers
     - **Cover Image**: Upload/replace/delete image
     - **Delete**: Cancel trip (danger zone)
   - Permission-based rendering (organizers only)
   - Optimistic updates with TanStack Query

6. **ImageUpload** (`apps/web/src/components/trip/image-upload.tsx`)
   - Drag-and-drop or click to upload
   - File validation (size, type)
   - Image preview with metadata
   - Clear selection button

**API Flow Example - Creating a Trip:**

```
User Action → Frontend → API → Database → Response
─────────────────────────────────────────────────

1. User clicks "Create Trip" button
   └─> Opens CreateTripDialog

2. User fills Step 1 (name, destination, dates, timezone)
   └─> Validates locally with Zod schema
   └─> Clicks "Next" to Step 2

3. User fills Step 2 (description, cover image)
   └─> Validates locally with Zod schema
   └─> Clicks "Create Trip"

4. Frontend: TanStack Query mutation
   └─> POST /api/trips (trip data without image)
   └─> Optimistic update: Add trip to cache

5. API: TripService.createTrip()
   ├─> Validate request with Zod schema
   ├─> Check user has complete profile
   ├─> Insert into trips table
   ├─> Insert creator as organizer
   ├─> Insert creator as member (status: "going")
   └─> Return created trip

6. Frontend: Upload cover image (if selected)
   └─> POST /api/trips/:id/cover-image (multipart/form-data)

7. API: UploadService.uploadFile()
   ├─> Validate file size (<= 5MB)
   ├─> Validate MIME type (image/jpeg, image/png, image/webp)
   ├─> Save file to uploads/ directory
   ├─> Update trip.coverImageUrl
   └─> Return image URL

8. Frontend: Success
   ├─> Close dialog
   ├─> Invalidate trips query cache
   ├─> Navigate to trip detail page
   └─> Show success toast
```

**Environment Variables:**

```bash
# File upload configuration
UPLOAD_DIR=uploads                                    # Directory for uploaded files
MAX_FILE_SIZE=5242880                                # 5MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp  # Accepted image formats
```

**Testing:**

- **Unit Tests**: TripService, PermissionsService, UploadService
- **Integration Tests**: All 9 trip API endpoints
- **E2E Tests**: Complete trip management flows (902 lines, 4 test suites)
  - Trip creation with 2-step form
  - Trip editing with all tabs
  - Permission enforcement
  - Co-organizer management

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
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAddEvent(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newEvent: NewEvent) => api.events.create(tripId, newEvent),

    // Optimistic update
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events", tripId] });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData(["events", tripId]);

      // Optimistically update
      queryClient.setQueryData(["events", tripId], (old: Event[]) => [
        ...old,
        { ...newEvent, id: "temp-id", createdAt: new Date() },
      ]);

      return { previousEvents };
    },

    // Rollback on error
    onError: (err, newEvent, context) => {
      queryClient.setQueryData(["events", tripId], context.previousEvents);
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["events", tripId] });
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
    const dateKey = format(event.startDate, "yyyy-MM-dd");

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

### Monorepo Structure (✅ Implemented)

**Current Structure:**

```
tripful/
├── apps/
│   ├── api/              (@tripful/api) - Fastify backend server
│   │   ├── src/
│   │   │   ├── server.ts             # Entry point, Fastify app setup
│   │   │   ├── config/
│   │   │   │   ├── env.ts            # Environment variable validation
│   │   │   │   └── database.ts       # Drizzle connection
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts  # Auth endpoint handlers
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts     # Business logic for auth
│   │   │   │   └── sms.service.ts      # Mock SMS service
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts  # JWT verification
│   │   │   │   ├── error.middleware.ts # Error handling
│   │   │   │   └── rate-limit.middleware.ts  # SMS rate limiting
│   │   │   ├── db/
│   │   │   │   ├── schema/
│   │   │   │   │   └── index.ts        # Users, verification_codes tables
│   │   │   │   └── migrations/
│   │   │   │       └── 0000_smooth_sharon_ventura.sql
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.ts      # Auth route registration
│   │   │   └── utils/
│   │   │       └── phone.ts            # Phone validation (libphonenumber-js)
│   │   ├── tests/
│   │   │   ├── unit/                   # 8 unit test files
│   │   │   └── integration/            # 9 integration test files
│   │   ├── drizzle.config.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   └── web/              (@tripful/web) - Next.js 16 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/             # Auth route group
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── verify/page.tsx
│       │   │   │   └── complete-profile/page.tsx
│       │   │   ├── (app)/              # Protected route group
│       │   │   │   └── dashboard/page.tsx
│       │   │   ├── providers/
│       │   │   │   ├── auth-provider.tsx  # Auth context
│       │   │   │   └── query-provider.tsx
│       │   │   └── layout.tsx
│       │   ├── components/ui/          # Radix UI + shadcn components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── label.tsx
│       │   │   ├── select.tsx
│       │   │   └── form.tsx
│       │   └── lib/
│       │       └── api.ts              # API client wrapper
│       ├── tests/e2e/
│       │   └── auth-flow.spec.ts       # 4 E2E test scenarios
│       ├── playwright.config.ts
│       └── package.json
├── shared/               (@tripful/shared) - Shared types & schemas
│   ├── schemas/
│   │   ├── auth.ts                 # Zod schemas for auth endpoints
│   │   └── index.ts
│   ├── types/
│   │   ├── user.ts                 # User, AuthResponse interfaces
│   │   └── index.ts                # ApiResponse, ErrorResponse types
│   └── package.json
├── docs/
│   └── 2026-02-01-tripful-mvp/
│       ├── PRD.md
│       ├── DESIGN.md
│       └── ARCHITECTURE.md (this file)
├── docker-compose.yml        # PostgreSQL 16 (port 5433)
├── turbo.json                # Build pipeline configuration
├── pnpm-workspace.yaml       # Workspace package list
├── tsconfig.base.json        # Shared TypeScript config
└── package.json              # Root workspace scripts
```

**Package Details:**

| Package         | Version | Description                              |
| --------------- | ------- | ---------------------------------------- |
| @tripful/api    | private | Fastify backend with auth implementation |
| @tripful/web    | private | Next.js 16 frontend with Radix UI        |
| @tripful/shared | private | Shared Zod schemas and TypeScript types  |

**Note:** All packages are private (not published). Shared package uses root-level structure (not nested under `packages/`).

### Environment Variables (✅ Implemented)

**Backend (apps/api/.env)**

Validated via `/apps/api/src/config/env.ts` using Zod schemas:

```bash
# Server Configuration
NODE_ENV=development              # development | test | production
PORT=8000                         # Default: 8000
HOST=0.0.0.0                      # Default: 0.0.0.0
LOG_LEVEL=info                    # fatal | error | warn | info | debug | trace

# Database (Required)
DATABASE_URL=postgresql://tripful:tripful_dev@localhost:5433/tripful

# JWT Authentication (Required in production, auto-generated in dev)
JWT_SECRET=your-secret-key-min-32-characters-for-security

# CORS
FRONTEND_URL=http://localhost:3000

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

**Frontend (apps/web/.env.local)**

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Docker PostgreSQL Configuration (docker-compose.yml):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tripful
      POSTGRES_PASSWORD: tripful_dev
      POSTGRES_DB: tripful
    ports:
      - "5433:5432" # External:Internal (avoids conflict with local PostgreSQL)
```

### Development Workflow (✅ Implemented)

**1. Start PostgreSQL Database**

```bash
pnpm db:up
# Starts PostgreSQL 16 on localhost:5433
```

**2. Run Database Migrations**

```bash
cd apps/api
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Apply migrations to database
```

**3. Start Development Servers**

**Option A: Start all services (recommended)**

```bash
# From root directory
pnpm dev
# Starts both API (8000) and Web (3000) in parallel via Turbo
```

**Option B: Start individual services**

```bash
# API only
pnpm dev:api
# or
pnpm --filter @tripful/api dev

# Web only
pnpm dev:web
# or
pnpm --filter @tripful/web dev
```

**4. Run Tests**

```bash
# All tests (unit + integration + E2E)
pnpm test

# E2E tests only (Playwright)
pnpm test:e2e

# Watch mode (unit tests)
pnpm test:watch

# API tests only
pnpm --filter @tripful/api test
```

**5. Database Management**

```bash
# Open Drizzle Studio (visual DB editor)
cd apps/api
pnpm db:studio

# Stop database
pnpm db:down
```

**6. Linting & Type Checking**

```bash
# Lint all packages
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# TypeScript type checking
pnpm typecheck
```

**Available Scripts (Root `package.json`):**

| Script            | Description                       |
| ----------------- | --------------------------------- |
| `pnpm dev`        | Start all dev servers in parallel |
| `pnpm dev:api`    | Start API server only             |
| `pnpm dev:web`    | Start web server only             |
| `pnpm build`      | Build all packages for production |
| `pnpm test`       | Run all tests                     |
| `pnpm test:e2e`   | Run Playwright E2E tests          |
| `pnpm test:watch` | Watch mode for tests              |
| `pnpm lint`       | Run ESLint on all packages        |
| `pnpm lint:fix`   | Fix auto-fixable lint issues      |
| `pnpm typecheck`  | Run TypeScript compiler checks    |
| `pnpm db:up`      | Start PostgreSQL via Docker       |
| `pnpm db:down`    | Stop PostgreSQL                   |

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

**Linting**

- ESLint 9.x with flat config (`eslint.config.js`)
- `@eslint/js` for recommended configs
- TypeScript ESLint plugin for type-aware linting

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
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

### ✅ Unit Tests (Vitest) - 8 Test Files Implemented

**Location:** `apps/api/tests/unit/`

**Configuration:** `apps/api/vitest.config.ts`

- Environment: Node.js
- Test timeout: 10 seconds
- Parallel execution: 4 max concurrency
- Pool: threads with isolation disabled

**Implemented Test Files:**

1. **`phone.test.ts`** - Phone number validation
   - Validates E.164 format conversion
   - Tests country code detection
   - Validates test numbers (555) in dev/test

2. **`auth.service.test.ts`** - Authentication service logic
   - Code generation (6 digits)
   - Code storage with expiry
   - Code verification logic
   - User creation and retrieval
   - JWT token generation

3. **`schema.test.ts`** - Zod schema validation
   - `requestCodeSchema` validation
   - `verifyCodeSchema` validation
   - `completeProfileSchema` validation
   - Error message testing

4. **`jwt-config.test.ts`** - JWT configuration
   - Token signing
   - Token verification
   - Expiry validation
   - Payload structure

5. **`sms.service.test.ts`** - SMS service mocking
   - Mock SMS logging
   - Phone number formatting
   - Code delivery simulation

6. **`env.test.ts`** - Environment variable validation
7. **`database.test.ts`** - Database connection testing
8. **`rate-limit.test.ts`** - Rate limiting logic

**Running Tests:**

```bash
cd apps/api
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
```

---

### ✅ Integration Tests (Vitest) - 9 Test Files Implemented

**Location:** `apps/api/tests/integration/`

**Implemented Test Files:**

1. **`health.test.ts`** - Health check endpoint
   - GET /health returns 200

2. **`rate-limit.middleware.test.ts`** - Rate limiting
   - 5 requests per phone per hour
   - Rate limit reset after timeout
   - Custom error responses

3. **`auth.request-code.test.ts`** - Request verification code
   - Valid phone number accepts request
   - Invalid phone number rejects
   - Code stored in database
   - 5-minute expiry set correctly
   - Rate limiting enforced

4. **`auth.verify-code.test.ts`** - Verify code flow
   - Valid code creates/fetches user
   - Invalid code returns error
   - Expired code returns error
   - JWT token set in cookie
   - `requiresProfile` flag correct

5. **`auth.complete-profile.test.ts`** - Profile completion
   - Updates displayName and timezone
   - Validates input (3-50 chars)
   - Returns new JWT with updated name
   - Requires authentication

6. **`auth.me-logout.test.ts`** - Get user and logout
   - GET /api/auth/me returns current user
   - POST /api/auth/logout clears cookie
   - Requires valid JWT

7. **`auth.middleware.test.ts`** - Auth middleware
   - `authenticate()` validates JWT
   - `requireCompleteProfile()` checks displayName
   - Cookie and header token extraction
   - 401/403 error responses

8. **`database.test.ts`** - Database operations
   - Connection pooling
   - Query execution
   - Transaction handling

9. **`error.middleware.test.ts`** - Error handling
   - Validation errors (400)
   - Unauthorized errors (401)
   - Rate limit errors (429)
   - Server errors (500)

**Running Tests:**

```bash
cd apps/api
pnpm test           # Includes integration tests
```

**All 17 tests (unit + integration) passing.**

---

### ✅ E2E Tests (Playwright) - 4 Scenarios Implemented

**Location:** `apps/web/tests/e2e/auth-flow.spec.ts`

**Configuration:** `apps/web/playwright.config.ts`

- Base URL: http://localhost:3000
- Timeout: 30 seconds per test
- Sequential execution (no parallelism for DB isolation)
- Auto-start both API (8000) and web (3000) servers
- HTML reporter with screenshots on failure

**Implemented Test Scenarios:**

#### Test 1: Complete Authentication Journey

```typescript
test("complete authentication flow from login to dashboard", async ({
  page,
}) => {
  const phoneNumber = `+1555${Date.now()}`;

  // 1. Login page - enter phone number
  await page.goto("/login");
  await page.fill('input[type="tel"]', phoneNumber.slice(2));
  await page.click('button[type="submit"]');

  // 2. Verify page - enter code
  await page.waitForURL("/verify*");
  await page.fill('input[maxlength="6"]', "123456");
  await page.click('button:has-text("Verify")');

  // 3. Complete profile
  await page.waitForURL("/complete-profile");
  await page.fill('input[name="displayName"]', "Test User");
  await page.click('button[type="submit"]');

  // 4. Dashboard - verify logged in
  await page.waitForURL("/dashboard");
  await expect(page.locator("text=Test User")).toBeVisible();

  // 5. Verify auth cookie set
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((c) => c.name === "auth_token");
  expect(authCookie).toBeDefined();
  expect(authCookie?.httpOnly).toBe(true);
  expect(authCookie?.secure).toBe(true); // In production
});
```

#### Test 2: Logout Flow

```typescript
test("logout clears cookie and redirects to login", async ({ page }) => {
  // Complete auth flow first
  // ...

  // Logout
  await page.click('button:has-text("Logout")');
  await page.waitForURL("/login");

  // Verify cookie cleared
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((c) => c.name === "auth_token");
  expect(authCookie).toBeUndefined();

  // Verify cannot access protected route
  await page.goto("/dashboard");
  await page.waitForURL("/login");
});
```

#### Test 3: Protected Route Access

```typescript
test("accessing protected route without auth redirects to login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.waitForURL("/login");
});
```

#### Test 4: Existing User Path

```typescript
test("existing user skips profile completion", async ({ page }) => {
  // Create user via API
  const phoneNumber = `+1555${Date.now()}`;
  await fetch("http://localhost:8000/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });
  await fetch("http://localhost:8000/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, code: "123456" }),
  });

  // Complete profile via API
  // ...

  // Login again
  await page.goto("/login");
  await page.fill('input[type="tel"]', phoneNumber.slice(2));
  await page.click('button[type="submit"]');
  await page.fill('input[maxlength="6"]', "123456");
  await page.click('button:has-text("Verify")');

  // Should go directly to dashboard (skip profile)
  await page.waitForURL("/dashboard");
});
```

**Running E2E Tests:**

```bash
# From root
pnpm test:e2e

# From web directory
cd apps/web
pnpm test:e2e              # Headless mode
pnpm test:e2e:ui           # Playwright UI
pnpm test:e2e:headed       # Headed browser mode
```

**All 4 E2E tests passing.**

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
import { z } from "zod";

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
  methods: ["GET", "POST", "PATCH", "DELETE"],
});
```

### 7. Rate Limiting

```typescript
// Global rate limit
fastify.register(rateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

// SMS endpoint rate limit (stricter)
fastify.register(rateLimit, {
  max: 5,
  timeWindow: "1 hour",
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
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.phoneNumber, phoneNumber));
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
import Image from "next/image";

<Image
  src={trip.coverImageUrl}
  alt={trip.name}
  width={800}
  height={400}
  priority={false}
/>;
```

**Code Splitting**

- Automatic route-based splitting
- Dynamic imports for modals and heavy components

```tsx
import dynamic from "next/dynamic";

const EventFormModal = dynamic(() => import("@/components/EventFormModal"), {
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
  encodings: ["gzip", "deflate"],
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

### Development Timeline

**Phase 1: Project Setup & Infrastructure** ✅ COMPLETE
**Git Commit:** `faeb16c - Phase 1: Monorepo Setup with pnpm + Turbo + TypeScript`

- ✅ Monorepo setup (pnpm workspaces, Turbo)
- ✅ Backend: Fastify server, Drizzle ORM, PostgreSQL connection
- ✅ Frontend: Next.js App Router, Tailwind CSS, shadcn/ui setup
- ✅ Shared: Zod schemas, TypeScript configs, ESLint 9 flat config
- ✅ Docker Compose for PostgreSQL

**Phase 2: Authentication Feature** ✅ COMPLETE
**Git Commit:** `1fe5e5e - Phase 2: SMS Authentication with E2E Testing`

- ✅ Backend: Phone verification endpoints, JWT generation, mock SMS service
- ✅ Backend: Database-backed verification codes (5-min expiry)
- ✅ Backend: Rate limiting (5 SMS requests/hour per phone)
- ✅ Backend: Auth middleware (authenticate + requireCompleteProfile)
- ✅ Backend: Profile completion endpoint
- ✅ Backend: 17 tests (8 unit, 9 integration) - all passing
- ✅ Frontend: Login/verify pages, auth context, protected routes
- ✅ Frontend: Complete profile page with timezone selection
- ✅ Frontend: Dashboard with logout functionality
- ✅ Frontend: AuthProvider with TanStack Query
- ✅ Shared: Auth schemas, JWT types, User types
- ✅ E2E tests: 4 scenarios covering complete auth flow - all passing
- ✅ Database: users and verification_codes tables with migration

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

## Document Revision History

**Document Version**: 3.0
**Last Updated**: 2026-02-06
**Status**: Phase 1-3 Complete - Monorepo + Auth + Trip Management

**Version 3.0 Updates (2026-02-06)**:

- ✅ Documented Phase 3 completion: Trip Management with CRUD, permissions, and image uploads
- ✅ Added 9 trip API endpoints with full request/response documentation
- ✅ Documented 3 new services: TripService, PermissionsService, UploadService
- ✅ Added comprehensive trip management flow documentation
- ✅ Documented database schema updates (trips, organizers, members tables)
- ✅ Added frontend components documentation (CreateTripDialog, EditTripDialog, ImageUpload)
- ✅ Documented permission system and access control rules
- ✅ Added environment variables for file uploads (UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES)
- ✅ Documented E2E tests for trip management (902 lines, 4 test suites)
- ✅ Updated dashboard with trip grouping and search functionality
- ✅ Marked Phase 4-8 as planned (invitations, events, accommodations, etc.)

**Version 2.0 Updates (2026-02-04)**:

- ✅ Documented Phase 1 completion: Monorepo setup with pnpm + Turbo + TypeScript
- ✅ Documented Phase 2 completion: SMS authentication with E2E testing
- ✅ Added actual codebase structure with file paths
- ✅ Documented 17 backend tests (8 unit, 9 integration) - all passing
- ✅ Documented 4 E2E tests covering complete auth flow - all passing
- ✅ Added actual API endpoint documentation with request/response examples
- ✅ Documented JWT implementation with httpOnly cookie storage
- ✅ Added auth middleware implementation details
- ✅ Updated environment variables with Zod validation
- ✅ Added development workflow scripts and commands
- ✅ Marked Phase 3-8 as planned (not yet implemented)

**Version 1.1 Updates (2026-02-01)**:

- Renamed `rsvps` table to `members` with proper ID primary key
- Changed verification codes from in-memory to database-backed storage
- Added comprehensive schema definitions for all tables
- Noted that core flows have been implemented in demo

**Git Commits Referenced**:

- `2c31b4f` - Ralph: Task 30 - Task 7.3: Code review and cleanup (Phase 3)
- `1fe5e5e` - Phase 2: SMS Authentication with E2E Testing
- `faeb16c` - Phase 1: Monorepo Setup with pnpm + Turbo + TypeScript
- `2c8a3eb` - MVP Demo: Tripful Core Features Implementation
