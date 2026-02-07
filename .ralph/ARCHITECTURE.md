# Architecture: Frontend Best Practices

Comprehensive frontend improvements for the Tripful web app based on three audit reports (Next.js best practices, React performance, TanStack Query). Covers bundle optimization, Next.js features adoption, RSC migration with server-side prefetching, TanStack Query v5 patterns, code deduplication, and error handling.

## Overview

The web app (`apps/web`) currently treats nearly every page as a client component, missing Next.js optimization features. This work migrates key pages to server components, adds server-side data prefetching via TanStack Query hydration, adopts Next.js features (fonts, images, error boundaries, metadata), optimizes bundle size, and applies React/TanStack Query best practices.

## Scope

All P0-P4 items from three audits:
- **Next.js audit**: 19 findings across 14 categories
- **React performance audit**: 16 findings across 9 categories
- **TanStack Query audit**: findings across 9 categories

---

## 1. Shared Types Migration

Move frontend-only Trip types to the shared package for reuse in server-side fetching.

### Types to Move

From `apps/web/src/hooks/use-trips.ts` (lines 10-101) to `shared/types/trip.ts`:

```typescript
// shared/types/trip.ts
export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  isOrganizer: boolean;
  rsvpStatus: "going" | "not_going" | "maybe" | "no_response";
  organizerInfo: Array<{
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  }>;
  memberCount: number;
  eventCount: number;
}

export interface TripDetail {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  preferredTimezone: string;
  description: string | null;
  coverImageUrl: string | null;
  createdBy: string;
  allowMembersToAddEvents: boolean;
  cancelled: boolean;
  createdAt: string;
  updatedAt: string;
  organizers: Array<{
    id: string;
    displayName: string;
    phoneNumber: string;
    profilePhotoUrl: string | null;
    timezone: string;
  }>;
  memberCount: number;
}

// API response wrappers
export interface GetTripsResponse {
  success: true;
  data: TripSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetTripResponse {
  success: true;
  trip: TripDetail;
}

export interface CreateTripResponse {
  success: true;
  trip: TripDetail;
}

export interface UpdateTripResponse {
  success: true;
  trip: TripDetail;
}
```

Export from `shared/types/index.ts` barrel file.

---

## 2. Bundle Optimization

### 2.1 optimizePackageImports for lucide-react

**File**: `apps/web/next.config.ts`

Add `experimental.optimizePackageImports` to prevent loading all 1,583 lucide-react modules:

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["@tripful/shared"],
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};
```

### 2.2 Dynamic Imports for Dialog Components

**Files**: `apps/web/src/app/(app)/dashboard/page.tsx`, `apps/web/src/app/(app)/trips/[id]/page.tsx`

Use `next/dynamic` for dialogs that only render when user clicks a button:

```typescript
import dynamic from "next/dynamic";

const CreateTripDialog = dynamic(
  () => import("@/components/trip/create-trip-dialog").then((m) => m.CreateTripDialog),
  { ssr: false }
);
```

### 2.3 Preload on Hover/Focus

After dynamic imports, add preload functions for buttons that open dialogs:

```typescript
const preloadCreateTrip = () => void import("@/components/trip/create-trip-dialog");

<button
  onMouseEnter={preloadCreateTrip}
  onFocus={preloadCreateTrip}
  onClick={() => setCreateDialogOpen(true)}
>
```

---

## 3. next/font Optimization

### Font Declaration

**New file**: `apps/web/src/lib/fonts.ts`

```typescript
import { Playfair_Display } from "next/font/google";

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
```

### Root Layout Integration

**File**: `apps/web/src/app/layout.tsx`

Apply the font CSS variable on `<html>`:

```typescript
import { playfairDisplay } from "@/lib/fonts";

<html lang="en" className={playfairDisplay.variable}>
```

### Replace Inline Styles

Remove all `style={{ fontFamily: "Playfair Display, serif" }}` usages across 6 files (12+ locations) and replace with the CSS variable class `font-[family-name:var(--font-playfair)]` or add a Tailwind utility.

**Files affected**:
- `apps/web/src/app/(app)/dashboard/page.tsx` (6 occurrences)
- `apps/web/src/app/(app)/trips/[id]/page.tsx` (3 occurrences)
- `apps/web/src/components/trip/trip-card.tsx` (1 occurrence)
- `apps/web/src/components/trip/create-trip-dialog.tsx` (1 occurrence)
- `apps/web/src/components/trip/edit-trip-dialog.tsx` (1 occurrence)

---

## 4. next/image Optimization

### Remote Patterns Configuration

**File**: `apps/web/next.config.ts`

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**",  // Adjust to specific domains in production
    },
  ],
},
```

### Replace `<img>` Tags

Replace all native `<img>` tags with `next/image` `Image` component:

**Files**:
- `apps/web/src/app/(app)/trips/[id]/page.tsx` (lines 160, 228 -- cover image + avatars)
- `apps/web/src/components/trip/trip-card.tsx` (lines 148, 207 -- cover image + avatars)
- `apps/web/src/components/trip/image-upload.tsx` (line 210 -- preview with `unoptimized` for blob URLs)

For cover images (hero sections), use `fill` layout with `sizes` attribute and `priority` for above-the-fold images.

---

## 5. Error Handling

### Error Boundary Files

Create Next.js App Router error boundaries:

**New files**:
- `apps/web/src/app/global-error.tsx` -- Root error boundary (must include `<html>` and `<body>`)
- `apps/web/src/app/not-found.tsx` -- Custom 404 page
- `apps/web/src/app/(app)/error.tsx` -- Protected section error boundary
- `apps/web/src/app/(auth)/error.tsx` -- Auth section error boundary

All `error.tsx` files must be client components (`"use client"`). They receive `error` and `reset` props for error recovery.

### TanStack Query Error Boundaries

Add `throwOnError` for 5xx server errors so they bubble to Next.js error boundaries:

```typescript
// In query client defaults or individual queries
throwOnError: (error) => {
  if (error instanceof APIError) {
    return error.code === "INTERNAL_SERVER_ERROR";
  }
  return true; // Unknown errors should always throw
}
```

---

## 6. Metadata

### Root Layout Title Template

**File**: `apps/web/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: { default: "Tripful", template: "%s | Tripful" },
  description: "Plan and share your adventures",
};
```

### Static Metadata Files

**New files** (in `apps/web/src/app/`):
- `robots.ts` -- Search engine directives
- `sitemap.ts` -- Sitemap for public pages
- Place `favicon.ico` in `apps/web/src/app/` or `apps/web/public/`

### Page-Specific Metadata

Once pages become server components (Phase 4), export `generateMetadata` for dynamic pages:

```typescript
// trips/[id]/page.tsx (server component)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // Fetch trip name for title
  return { title: tripName };
}
```

---

## 7. Loading & File Conventions

### Loading Files

**New files**:
- `apps/web/src/app/(app)/dashboard/loading.tsx` -- Dashboard skeleton
- `apps/web/src/app/(app)/trips/[id]/loading.tsx` -- Trip detail skeleton

These create automatic Suspense boundaries for route transitions. Extract existing `SkeletonCard` and `SkeletonDetail` into these files.

---

## 8. Navigation Improvements

### Replace router.push with Link

**File**: `apps/web/src/components/trip/trip-card.tsx`
- Replace `router.push(\`/trips/${trip.id}\`)` with wrapping content in `<Link href={...}>` for prefetching and accessibility.

**File**: `apps/web/src/app/(app)/trips/[id]/page.tsx`
- Replace "Return to dashboard" `router.push("/dashboard")` with `<Link href="/dashboard">`.

---

## 9. Code Deduplication

### Extract Shared Utilities

**New file**: `apps/web/src/lib/format.ts`

Extract from `trip-card.tsx` and `trips/[id]/page.tsx`:
- `formatDateRange(startDate, endDate)` -- Date range formatting
- `getInitials(name)` -- Avatar initials from name

Hoist `Intl.DateTimeFormat` instances to module scope for performance.

### Extract Shared Constants

**New file**: `apps/web/src/lib/constants.ts`

Extract from `complete-profile/page.tsx`, `create-trip-dialog.tsx`, `edit-trip-dialog.tsx`:
- `TIMEZONES` array (duplicated in 3 files)

### Centralize API_URL

**File**: `apps/web/src/lib/api.ts`

Export `API_URL` constant. Remove duplicates from:
- `apps/web/src/app/providers/auth-provider.tsx` (line 13)
- `apps/web/src/components/trip/image-upload.tsx` (lines 98-99)

---

## 10. React Performance Optimizations

### React.memo for TripCard

**File**: `apps/web/src/components/trip/trip-card.tsx`

Wrap `TripCard` in `React.memo()` to prevent unnecessary re-renders when parent state changes (e.g., search query) but individual trip data hasn't changed.

### AuthContext Value Stability

**File**: `apps/web/src/app/providers/auth-provider.tsx`

Wrap function declarations in `useCallback` and memoize context value with `useMemo`:

```typescript
const login = useCallback(async (phoneNumber: string) => { ... }, []);
const logout = useCallback(async () => { ... }, [router]);
const value = useMemo(() => ({
  user, loading, login, verify, completeProfile, logout, refetch: fetchUser
}), [user, loading, login, verify, completeProfile, logout, fetchUser]);
```

### Combine Array Iterations

**File**: `apps/web/src/app/(app)/dashboard/page.tsx`

Replace double `.filter()` for upcoming/past trips with a single loop.

### Simplify Navigation State

**Files**: `apps/web/src/app/(auth)/verify/page.tsx`, `complete-profile/page.tsx`

Remove `shouldNavigate` state + useEffect pattern. Navigate directly in async handlers.

### Hoist Regex

**File**: `apps/web/src/components/trip/create-trip-dialog.tsx`

Hoist phone validation regex to module scope.

---

## 11. TanStack Query v5 Improvements

### Replace isLoading with isPending

Replace all `isLoading` usage with `isPending` across:
- `apps/web/src/hooks/use-trips.ts` (JSDoc)
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/trips/[id]/page.tsx`
- All corresponding test files

### Query Options Factory

**File**: `apps/web/src/hooks/use-trips.ts`

Introduce `queryOptions` factory pattern:

```typescript
import { queryOptions } from "@tanstack/react-query";

export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => ["trips", id] as const,
};

export const tripsQueryOptions = queryOptions({
  queryKey: tripKeys.all,
  queryFn: async () => {
    const response = await apiRequest<GetTripsResponse>("/trips");
    return response.data;
  },
});

export const tripDetailQueryOptions = (tripId: string) =>
  queryOptions({
    queryKey: tripKeys.detail(tripId),
    queryFn: async () => {
      const response = await apiRequest<GetTripResponse>(`/trips/${tripId}`);
      return response.trip;
    },
    enabled: !!tripId,
  });
```

### Query Client Configuration

**File**: `apps/web/src/app/providers/providers.tsx`

- Add `gcTime: 1000 * 60 * 60` (1 hour)
- Add `refetchOnWindowFocus: false`
- Add smart retry that skips 404s:

```typescript
retry: (failureCount, error) => {
  if (error instanceof APIError && error.code === "NOT_FOUND") return false;
  return failureCount < 1;
}
```

### Remove Duplicate Invalidations

Remove `invalidateQueries` from `onSuccess` in all three mutation hooks (keep only in `onSettled`).

### Install DevTools

Install `@tanstack/react-query-devtools` as dev dependency. Add to providers:

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Install ESLint Plugin

Install `@tanstack/eslint-plugin-query` as dev dependency and add to ESLint config.

### Signal Forwarding

Update `apiRequest` in `apps/web/src/lib/api.ts` to accept and forward `AbortSignal`:

```typescript
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<T>
```

Update query hooks to pass signal from query context.

### Remove Deprecated Logger

Remove `logger` option from test QueryClient instances in `use-trips.test.tsx`.

### Add Mutation Keys

Add `mutationKey` to all three mutation hooks for cross-component tracking.

### Add Prefetch Hook

Add `usePrefetchTrip(tripId)` hook for hover prefetching on trip cards.

---

## 12. RSC Migration & Server-Side Prefetching

### getQueryClient Utility

**New file**: `apps/web/src/lib/get-query-client.ts`

```typescript
import {
  isServer,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
```

### Server-Side API Client

**New file**: `apps/web/src/lib/server-api.ts`

```typescript
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:8000/api";

export async function serverApiRequest<T>(endpoint: string): Promise<T> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}
```

### Auth Layout Guard (Server Component)

**File**: `apps/web/src/app/(app)/layout.tsx`

Convert from client component to server component:

```typescript
// Remove "use client"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");

  if (!authToken?.value) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

### Dashboard Page (Server Component with Hydration)

**File**: `apps/web/src/app/(app)/dashboard/page.tsx`

Split into server component (page) + client component (interactive content):

```typescript
// page.tsx (server component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { tripsQueryOptions } from "@/hooks/use-trips";
import { DashboardContent } from "./dashboard-content";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tripsQueryOptions);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  );
}
```

**New file**: `apps/web/src/app/(app)/dashboard/dashboard-content.tsx`

Move all existing dashboard logic (search, filtering, trip cards, dialogs) to this `"use client"` component. The component uses `useTrips()` which will immediately have cached data from the server prefetch -- no loading skeleton on first render.

### Trip Detail Page (Server Component with Hydration)

Same pattern for `apps/web/src/app/(app)/trips/[id]/page.tsx`:

```typescript
// page.tsx (server component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { tripDetailQueryOptions } from "@/hooks/use-trips";
import { TripDetailContent } from "./trip-detail-content";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: "Trip Details" };
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tripDetailQueryOptions(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TripDetailContent tripId={id} />
    </HydrationBoundary>
  );
}
```

**New file**: `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`

Move existing trip detail logic to this `"use client"` component. Receives `tripId` as prop instead of using `useParams()`.

### Provider Update

**File**: `apps/web/src/app/providers/providers.tsx`

Update to use `getQueryClient()` instead of inline `useState(() => new QueryClient(...))`:

```typescript
"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Environment Variable

Add `API_URL` (non-public, server-side only) to `apps/web/.env.local.example`:

```
API_URL=http://localhost:8000/api
```

---

## 13. Auth Provider Adjustments

The `AuthProvider` remains a client component and continues to manage auth state via Context. The server layout guard handles initial auth redirects, but the client-side `useAuth()` hook is still needed for:
- Client-side navigation after login/logout
- Providing user info to components (organizer checks, etc.)
- Login/verify/completeProfile/logout methods

No migration to TanStack Query for auth state at this time -- this is a deliberate scope decision to keep the change manageable.

---

## Testing Strategy

### Unit Tests
- Update existing tests in `use-trips.test.tsx` to reflect `isPending` instead of `isLoading`
- Remove deprecated `logger` option from test QueryClient instances
- Update dashboard/trip detail page tests for new component structure (mock the `*Content` components or test the content components directly)
- Test new utilities: `formatDateRange`, `getInitials`, `TIMEZONES`

### Integration Tests
- Test `getQueryClient` server/client behavior
- Test `serverApiRequest` with cookie forwarding

### E2E Tests
- Update existing E2E tests if component structure changes affect selectors
- Verify auth flow still works with server layout guard
- Verify dashboard and trip detail pages load with prefetched data (no loading skeleton flash)

### Type Checking
- Verify shared types compile correctly after migration
- Ensure no type regressions from RSC refactoring
