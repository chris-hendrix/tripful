# Architecture: Frontend Design Overhaul

Redesign the Tripful web app frontend with a travel-poster-inspired visual identity (Capri/Mediterranean), proper design token system, app shell with navigation, and accessibility fixes. Addresses all findings from three audits: frontend-design, shadcn-ui, and web-design-guidelines.

## Brand Direction

Inspired by vintage Italian travel posters (Capri by Mario Puppo). Warm, vivid, Mediterranean palette with classic serif typography. The CSS variable system is architected to support multiple travel-poster themes in the future (Alpine, Tropical, Nordic), but only the default Mediterranean theme is implemented now.

## Color Palette (Vivid Capri)

All colors defined as HSL values for CSS custom properties:

| Token                            | Hex     | HSL         | Usage                             |
| -------------------------------- | ------- | ----------- | --------------------------------- |
| `--color-primary`                | #1A5F9E | 210 72% 36% | Primary actions, links, branding  |
| `--color-primary-foreground`     | #FFFFFF | 0 0% 100%   | Text on primary                   |
| `--color-accent`                 | #D4603A | 16 62% 53%  | Terracotta accent, secondary CTAs |
| `--color-accent-foreground`      | #FFFFFF | 0 0% 100%   | Text on accent                    |
| `--color-background`             | #FAF5EE | 36 60% 96%  | Page background (warm cream)      |
| `--color-foreground`             | #3A2E22 | 27 27% 18%  | Primary text (dark warm brown)    |
| `--color-card`                   | #FFFFFF | 0 0% 100%   | Card surfaces                     |
| `--color-card-foreground`        | #3A2E22 | 27 27% 18%  | Text on cards                     |
| `--color-muted`                  | #F0EBE3 | 34 28% 91%  | Muted backgrounds (warm gray)     |
| `--color-muted-foreground`       | #8C8274 | 34 10% 50%  | Secondary text (sandy gray)       |
| `--color-border`                 | #E5DDD2 | 34 28% 86%  | Borders (warm)                    |
| `--color-input`                  | #E5DDD2 | 34 28% 86%  | Input borders                     |
| `--color-ring`                   | #1A5F9E | 210 72% 36% | Focus rings                       |
| `--color-secondary`              | #F0EBE3 | 34 28% 91%  | Secondary buttons                 |
| `--color-secondary-foreground`   | #3A2E22 | 27 27% 18%  | Text on secondary                 |
| `--color-destructive`            | #C4382A | 5 65% 47%   | Destructive actions (coral red)   |
| `--color-destructive-foreground` | #FFFFFF | 0 0% 100%   | Text on destructive               |
| `--color-popover`                | #FFFFFF | 0 0% 100%   | Popover surfaces                  |
| `--color-popover-foreground`     | #3A2E22 | 27 27% 18%  | Text on popovers                  |

### Additional Semantic Tokens

| Token                        | Hex     | HSL         | Usage                              |
| ---------------------------- | ------- | ----------- | ---------------------------------- |
| `--color-success`            | #4A7C59 | 140 27% 39% | Success/Going badges (olive green) |
| `--color-success-foreground` | #FFFFFF | 0 0% 100%   | Text on success                    |
| `--color-warning`            | #C48A2A | 38 66% 47%  | Warning/Maybe badges (warm amber)  |
| `--color-warning-foreground` | #FFFFFF | 0 0% 100%   | Text on warning                    |

## Typography

### Font Loading (`apps/web/src/lib/fonts.ts`)

```typescript
import { Playfair_Display, DM_Sans } from "next/font/google";

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
```

### Font Application

- Root `<html>` gets both font CSS variables: `className={cn(playfairDisplay.variable, dmSans.variable)}`
- Body uses DM Sans as default: via `@theme { --font-sans: var(--font-dm-sans); }`
- Display headings use Playfair: `font-[family-name:var(--font-playfair)]` (already used in codebase)

### Type Scale

| Role          | Classes                                                          | Font              |
| ------------- | ---------------------------------------------------------------- | ----------------- |
| Page title    | `text-4xl font-bold font-[family-name:var(--font-playfair)]`     | Playfair Display  |
| Section title | `text-2xl font-semibold font-[family-name:var(--font-playfair)]` | Playfair Display  |
| Card title    | `text-xl font-semibold font-[family-name:var(--font-playfair)]`  | Playfair Display  |
| Body          | `text-base`                                                      | DM Sans (default) |
| Caption/label | `text-sm text-muted-foreground`                                  | DM Sans           |
| Small         | `text-xs text-muted-foreground`                                  | DM Sans           |

## Component Architecture

### New Components to Install (shadcn/ui)

```bash
pnpm dlx shadcn@latest add sonner
pnpm dlx shadcn@latest add alert-dialog
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add breadcrumb
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add tooltip
```

### New Custom Components

#### App Header (`apps/web/src/components/app-header.tsx`)

```
<header>
  <nav aria-label="Main navigation">
    <Link href="/dashboard">
      <TripfulLogo /> (SVG wordmark or styled text)
    </Link>
    <nav-links: Dashboard (active state based on pathname)>
    <UserMenu>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar> (user initials fallback)
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem> Profile </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem> Log out </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </UserMenu>
  </nav>
</header>
```

- Uses `useAuth()` hook for user data and logout
- Must be a client component ("use client") for auth context and dropdown interactivity
- Active nav link styling based on `usePathname()`

#### Skip Link (`apps/web/src/components/skip-link.tsx`)

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute ..."
>
  Skip to main content
</a>
```

Added as first child of `<body>` in root layout.

### Modified Components

#### Button Variant (`apps/web/src/components/ui/button.tsx`)

Add `gradient` variant to `buttonVariants`:

```typescript
gradient:
  "bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 font-medium",
```

This replaces the 10+ instances of the hardcoded `from-blue-600 to-cyan-600` gradient string.

#### TripCard (`apps/web/src/components/trip/trip-card.tsx`)

- Replace `<div role="button" tabIndex={0} onClick>` with Next.js `<Link href={/trips/${trip.id}}>`
- Remove manual `onKeyDown` handler (Link handles it natively)
- Supports middle-click/cmd-click to open in new tab
- Keep hover/active animations on the Link wrapper

#### App Layout (`apps/web/src/app/(app)/layout.tsx`)

```tsx
export default async function ProtectedLayout({ children }) {
  // ... auth check ...
  return (
    <>
      <AppHeader />
      <main id="main-content">{children}</main>
    </>
  );
}
```

Note: AppHeader is a client component imported into this server component layout.

#### Auth Layout (`apps/web/src/app/(auth)/layout.tsx`)

Redesign with travel poster aesthetic:

- Warm cream background instead of dark gradient
- Subtle travel-poster-inspired illustration or pattern (geometric map lines, compass rose SVG)
- Remove `animate-pulse` gradient orbs
- Wrap content in `<main id="main-content">`
- Add Tripful wordmark above the auth card

#### Root Layout (`apps/web/src/app/layout.tsx`)

- Add skip link component as first child of `<body>`
- Add both font variables to `<html>` className
- Add `<Toaster />` (from Sonner) inside Providers
- Add `suppressHydrationWarning` on `<html>` (good practice for any future theming)

#### Landing Page (`apps/web/src/app/page.tsx`)

Simple branded landing:

- Travel poster aesthetic background
- Tripful wordmark with Playfair Display
- Tagline: "Plan and share your adventures"
- CTA button to `/login`
- Warm cream and azure palette

### Dashboard Page Changes (`apps/web/src/app/(app)/dashboard/dashboard-content.tsx`)

- Replace `space-y-4` trip list with responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Replace all hardcoded `slate-*`, `gray-*`, `blue-*` colors with design tokens
- Replace gradient button class strings with `<Button variant="gradient">`
- Replace raw `<button>` FAB with `<Button variant="gradient" size="icon">`
- Use Skeleton component for loading states
- Add `aria-live="polite"` to the trips list container for search result updates

### Trip Detail Page Changes (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`)

- Add `<Breadcrumb>` component above trip title: "My Trips > {trip.name}"
- Replace all hardcoded colors with design tokens
- Replace success banner with `toast.success()` from Sonner
- Add entrance animations to content sections
- Use `<Separator>` component for visual dividers

### Auth Pages Changes

All three auth pages (`login`, `verify`, `complete-profile`):

- Change `<h2>` to `<h1>` for proper heading hierarchy
- Add `autocomplete` attributes (`autocomplete="tel"` on phone, `autocomplete="name"` on display name)
- Replace hardcoded colors with design tokens
- Add `aria-required="true"` to required form fields

### Create/Edit Trip Dialog Changes

- Replace native `<input type="checkbox">` with shadcn `<Checkbox>` (already installed)
- Replace delete confirmation inline panel with `<AlertDialog>`
- Replace inline error banners with `toast.error()` from Sonner
- Replace gradient button class strings with `<Button variant="gradient">`
- Replace all hardcoded colors with design tokens
- Increase co-organizer remove button touch target to min 44x44px

### Image Upload Changes

- Replace raw `<button>` elements with shadcn `<Button>`
- Increase remove button touch target to min 44x44px
- Replace hardcoded colors with design tokens
- Add `<Tooltip>` on icon-only buttons

## Design Token Migration Strategy

### Phase 1: Update globals.css

Replace the entire `@theme` block with the Vivid Capri palette. Remove dark mode CSS variables.

### Phase 2: Systematic Color Replacement

| Hardcoded Pattern                           | Token Replacement                                   |
| ------------------------------------------- | --------------------------------------------------- |
| `text-slate-900`                            | `text-foreground`                                   |
| `text-slate-600`, `text-slate-500`          | `text-muted-foreground`                             |
| `bg-gray-50`                                | `bg-background`                                     |
| `bg-white`                                  | `bg-card`                                           |
| `border-slate-200`, `border-slate-300`      | `border-border`                                     |
| `bg-slate-200` (skeleton)                   | `bg-muted`                                          |
| `text-red-500`, `text-red-600`, `bg-red-50` | `text-destructive`, `bg-destructive/10`             |
| `bg-emerald-100 text-emerald-700`           | `bg-success/15 text-success`                        |
| `bg-amber-100 text-amber-700`               | `bg-warning/15 text-warning`                        |
| `from-blue-600 to-cyan-600`                 | Use `variant="gradient"` button                     |
| `border-red-200`                            | `border-destructive/30`                             |
| `focus:border-blue-500 focus:ring-blue-500` | `focus-visible:border-ring focus-visible:ring-ring` |
| `shadow-blue-500/30`                        | `shadow-primary/25`                                 |

### Phase 3: Add Success/Warning Tokens

Add `--color-success` and `--color-warning` to `@theme` block in globals.css. These need corresponding Tailwind utilities, which in Tailwind v4 are automatically generated from `@theme` CSS variables.

## Testing Strategy

### Unit Tests

- Update existing component tests that assert on markup changes (TripCard div→Link, heading levels)
- Add tests for new components: AppHeader, SkipLink, UserMenu

### Integration Tests

- Update dashboard and trip detail page tests for new markup structure
- Test breadcrumb navigation renders correctly

### E2E Tests (Playwright)

- New: Test app header navigation (click Dashboard link, verify navigation)
- New: Test user menu dropdown (open, click Profile, click Logout)
- New: Test breadcrumbs on trip detail page
- New: Test skip link functionality
- Existing: Ensure all existing E2E tests still pass

### Manual/Screenshot Tests

- Screenshot the landing page, auth pages, dashboard, and trip detail page
- Verify the travel poster aesthetic renders correctly
- Test responsive breakpoints (mobile, tablet, desktop)
- Verify toast notifications appear and dismiss correctly

## Files Changed Summary

### New Files

- `apps/web/src/components/app-header.tsx` - App shell header with navigation
- `apps/web/src/components/skip-link.tsx` - Accessibility skip link
- `apps/web/src/components/ui/sonner.tsx` - Sonner toast (via shadcn add)
- `apps/web/src/components/ui/alert-dialog.tsx` - Alert dialog (via shadcn add)
- `apps/web/src/components/ui/skeleton.tsx` - Skeleton loading (via shadcn add)
- `apps/web/src/components/ui/dropdown-menu.tsx` - Dropdown menu (via shadcn add)
- `apps/web/src/components/ui/breadcrumb.tsx` - Breadcrumb (via shadcn add)
- `apps/web/src/components/ui/avatar.tsx` - Avatar (via shadcn add)
- `apps/web/src/components/ui/separator.tsx` - Separator (via shadcn add)
- `apps/web/src/components/ui/tooltip.tsx` - Tooltip (via shadcn add)

### Modified Files

- `apps/web/src/app/globals.css` - New palette, remove dark mode
- `apps/web/src/lib/fonts.ts` - Add DM Sans font
- `apps/web/src/app/layout.tsx` - Skip link, font variables, Toaster
- `apps/web/src/app/(app)/layout.tsx` - App shell with header + main landmark
- `apps/web/src/app/(auth)/layout.tsx` - Travel poster redesign
- `apps/web/src/app/page.tsx` - Branded landing page
- `apps/web/src/app/(app)/dashboard/dashboard-content.tsx` - Token migration, grid, FAB
- `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` - Tokens, breadcrumbs, toast
- `apps/web/src/app/(auth)/login/page.tsx` - Tokens, h1, autocomplete
- `apps/web/src/app/(auth)/verify/page.tsx` - Tokens, h1, autocomplete
- `apps/web/src/app/(auth)/complete-profile/page.tsx` - Tokens, h1, autocomplete
- `apps/web/src/components/trip/trip-card.tsx` - Link conversion, tokens
- `apps/web/src/components/trip/create-trip-dialog.tsx` - Checkbox, tokens, gradient button
- `apps/web/src/components/trip/edit-trip-dialog.tsx` - AlertDialog, Checkbox, tokens
- `apps/web/src/components/trip/image-upload.tsx` - Button, touch targets, tokens
- `apps/web/src/components/ui/button.tsx` - Add gradient variant
- `apps/web/src/app/providers/providers.tsx` - Possibly add Toaster here
- `apps/web/package.json` - New dependencies (sonner, radix packages)

### Test Files (Updated/New)

- Existing test files updated for markup changes
- New E2E tests for navigation, breadcrumbs, skip link
