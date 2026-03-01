# Architecture: Trip Themes

Add a Partiful-style theme system. Templates (20 presets) are frontend-only and pre-fill visual properties. Users can also go fully custom. The DB stores the visual output (`theme_color`, `theme_icon`, `theme_font`), not the template ID.

---

## DB Schema

Add 3 nullable columns to `trips` table in `apps/api/src/db/schema/index.ts`:

```typescript
themeColor: varchar("theme_color", { length: 7 }),
themeIcon: varchar("theme_icon", { length: 10 }),
themeFont: varchar("theme_font", { length: 30 }),
```

All nullable — existing trips keep current behavior. Generate migration via `cd apps/api && pnpm db:generate`.

---

## Shared Types & Schemas

### `shared/types/trip.ts`

Add to `Trip`, `TripSummary`, and `TripDetail` interfaces:

```typescript
themeColor: string | null;
themeIcon: string | null;
themeFont: string | null;
```

### `shared/schemas/trip.ts`

Add to `baseTripSchema` (used by create + update):

```typescript
themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
themeIcon: z.string().max(10).nullable().optional(),
themeFont: z.enum(['clean', 'bold-sans', 'elegant-serif', 'playful', 'handwritten', 'condensed']).nullable().optional(),
```

Add to response schemas (`tripEntitySchema`, `tripSummarySchema`, `tripDetailSchema`).

---

## API Service

### `apps/api/src/services/trip.service.ts`

- `createTrip()`: Accept and store `themeColor`, `themeIcon`, `themeFont` in insert
- `getTripById()`: Return theme fields in response (both full and preview)
- `getUserTrips()`: Return theme fields in trip summaries
- `updateTrip()`: Accept theme field updates

No new endpoints — theme fields ride on existing trip CRUD.

### `apps/web/src/hooks/use-trips.ts`

Add `themeColor`, `themeIcon`, `themeFont` to create/update mutation payloads. Fields map directly (Drizzle handles snake_case ↔ camelCase).

---

## Font Setup

### Fonts to Load

| ID | Font Family | Status |
|----|-------------|--------|
| `clean` | Plus Jakarta Sans (system default) | Already loaded |
| `bold-sans` | Oswald | **New** |
| `elegant-serif` | Playfair Display | Already loaded |
| `playful` | Nunito | **New** |
| `handwritten` | Caveat | **New** |
| `condensed` | Barlow Condensed | **New** |

### `apps/web/src/lib/fonts.ts`

Add 4 new font imports via `next/font/google`:

```typescript
import { Oswald, Nunito, Caveat, Barlow_Condensed } from 'next/font/google';

export const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', display: 'swap' });
export const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
export const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' });
export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'], variable: '--font-barlow-condensed', display: 'swap',
  weight: ['400', '600', '700'],
});
```

### `apps/web/src/app/layout.tsx`

Add new font variables to the root `<html>` className alongside existing ones.

### Font Mapping — `apps/web/src/config/theme-fonts.ts` (new)

```typescript
export type ThemeFont = 'clean' | 'bold-sans' | 'elegant-serif' | 'playful' | 'handwritten' | 'condensed';

export const THEME_FONTS: Record<ThemeFont, string> = {
  'clean': 'var(--font-plus-jakarta)',
  'bold-sans': 'var(--font-oswald)',
  'elegant-serif': 'var(--font-playfair)',
  'playful': 'var(--font-nunito)',
  'handwritten': 'var(--font-caveat)',
  'condensed': 'var(--font-barlow-condensed)',
};
```

Font only applies to trip name / hero heading. Body text stays system font.

---

## Color Utilities

### `apps/web/src/lib/color-utils.ts` (new)

No external dependencies. ~40 lines of HSL math + WCAG contrast.

```typescript
// Core conversions
function hexToHsl(hex: string): { h: number; s: number; l: number };
function hslToHex(h: number, s: number, l: number): string;

// Manipulation
function darken(hex: string, amount: number): string;   // amount 0-1
function lighten(hex: string, amount: number): string;   // amount 0-1
function withAlpha(hex: string, alpha: number): string;  // returns rgba()

// Accessibility (WCAG 2.0)
function relativeLuminance(hex: string): number;         // 0-1
function contrastRatio(hex1: string, hex2: string): number; // 1-21
function readableForeground(bgHex: string): '#ffffff' | '#1a1a1a';

// Theme derivation
function deriveTheme(hex: string): {
  accent: string;           // base color as-is
  accentForeground: string; // white or dark via WCAG contrast
  heroGradient: string;     // CSS gradient: darken(30%) → base → lighten(15%)
  heroOverlay: string;      // base at 60% opacity
  subtleBg: string;         // base at 8% opacity
  border: string;           // base at 20% opacity
};
```

---

## Template System (Frontend-Only)

### `apps/web/src/config/trip-templates.ts` (new)

20 templates. Each pre-fills `themeColor`, `themeIcon`, `themeFont`. Picker shows gradient cards derived from `color` — no stock images.

```typescript
export interface TripTemplate {
  id: string;
  label: string;
  keywords: string[];
  color: string;    // hex
  icon: string;     // emoji
  font: ThemeFont;
}

export const TRIP_TEMPLATES: TripTemplate[] = [
  { id: 'bachelor-party', label: 'Bachelor Party', keywords: ['bachelor', 'stag', 'stag do'], color: '#e94560', icon: '🎰', font: 'bold-sans' },
  { id: 'bachelorette-party', label: 'Bachelorette Party', keywords: ['bachelorette', 'hen do', 'hen party'], color: '#ff69b4', icon: '💅', font: 'playful' },
  { id: 'wedding', label: 'Wedding', keywords: ['wedding', 'nuptials', 'ceremony', 'elopement'], color: '#d4a574', icon: '💒', font: 'elegant-serif' },
  { id: 'honeymoon', label: 'Honeymoon', keywords: ['honeymoon'], color: '#e8a0bf', icon: '🌅', font: 'elegant-serif' },
  { id: 'birthday', label: 'Birthday Trip', keywords: ['birthday', 'bday'], color: '#f59e0b', icon: '🎂', font: 'playful' },
  { id: 'girls-trip', label: "Girls' Trip", keywords: ['girls trip', 'girls weekend', 'ladies'], color: '#a855f7', icon: '👯', font: 'playful' },
  { id: 'guys-trip', label: "Guys' Trip", keywords: ['guys trip', 'boys trip', 'boys weekend'], color: '#3b82f6', icon: '🍻', font: 'bold-sans' },
  { id: 'beach', label: 'Beach', keywords: ['beach', 'coast', 'shore', 'tropical', 'island'], color: '#06b6d4', icon: '🏖️', font: 'playful' },
  { id: 'ski-trip', label: 'Ski Trip', keywords: ['ski', 'skiing', 'snowboard', 'slopes'], color: '#7dd3fc', icon: '⛷️', font: 'condensed' },
  { id: 'lake-house', label: 'Lake House', keywords: ['lake', 'lakehouse', 'lake house'], color: '#0d9488', icon: '🏡', font: 'handwritten' },
  { id: 'cabin', label: 'Cabin / Mountain', keywords: ['cabin', 'mountain', 'lodge', 'chalet'], color: '#78716c', icon: '🏔️', font: 'handwritten' },
  { id: 'camping', label: 'Camping', keywords: ['camping', 'campsite', 'glamping', 'tent'], color: '#65a30d', icon: '⛺', font: 'handwritten' },
  { id: 'city-break', label: 'City Break', keywords: ['city', 'downtown', 'urban', 'metro'], color: '#6366f1', icon: '🌃', font: 'clean' },
  { id: 'road-trip', label: 'Road Trip', keywords: ['road trip', 'roadtrip', 'cross country'], color: '#ea580c', icon: '🚗', font: 'handwritten' },
  { id: 'music-festival', label: 'Music Festival', keywords: ['festival', 'coachella', 'concert', 'bonnaroo'], color: '#d946ef', icon: '🎶', font: 'condensed' },
  { id: 'sports-event', label: 'Sports Event', keywords: ['game', 'super bowl', 'march madness', 'world cup'], color: '#16a34a', icon: '🏟️', font: 'bold-sans' },
  { id: 'wine-country', label: 'Wine Country', keywords: ['wine', 'vineyard', 'winery', 'napa', 'sonoma'], color: '#7f1d1d', icon: '🍷', font: 'elegant-serif' },
  { id: 'golf-trip', label: 'Golf Trip', keywords: ['golf', 'tee time', 'links'], color: '#166534', icon: '⛳', font: 'clean' },
  { id: 'spring-break', label: 'Spring Break', keywords: ['spring break', 'spring fling'], color: '#f472b6', icon: '🌴', font: 'condensed' },
  { id: 'reunion', label: 'Reunion', keywords: ['reunion', 'get together', 'gathering'], color: '#f97316', icon: '🤝', font: 'clean' },
];
```

**Ordering matters**: `bachelorette` listed before `bachelor` so "bachelorette bash" doesn't match "bachelor".

### `apps/web/src/lib/detect-template.ts` (new)

```typescript
export function detectTemplate(name: string): TripTemplate | null {
  const lower = name.toLowerCase();
  return TRIP_TEMPLATES.find(t => t.keywords.some(kw => lower.includes(kw))) ?? null;
}
```

Runs when user clicks "Next" on Step 1 of trip creation.

---

## UI Components

### Component Tree

```
TemplatePicker (sheet/dialog overlay)
├── TemplateGrid (20 template cards as gradient previews)
│   └── TemplateCard (color gradient + icon + label)
├── CustomThemeSection (when "Custom" selected)
│   ├── ColorPicker (grid of 12-16 preset hex colors)
│   ├── IconPicker (curated grid of 30-40 travel emojis)
│   └── FontPicker (6 radio options with font preview text)
└── Actions (confirm / clear / cancel)

ThemePreviewCard (compact inline: color swatch + icon + name + "Change theme" link)
```

### New files in `apps/web/src/components/trip/`

| File | Purpose |
|------|---------|
| `template-picker.tsx` | Full overlay with template grid + custom section |
| `color-picker.tsx` | Grid of 12-16 preset hex colors with selection state |
| `icon-picker.tsx` | Grid of 30-40 curated travel emojis with selection state |
| `font-picker.tsx` | 6 radio options, each rendering name in its own font |
| `theme-preview-card.tsx` | Compact card with swatch, icon, name, "Change theme" link |

### Color Picker Presets

Deduplicated from the 20 template colors, plus a few neutrals. ~16 colors total.

### Icon Picker Curated Emojis

~30-40 travel/party emojis organized by category:
- **Celebrations**: 🎉 🎂 🎰 💅 💒 🤝 🎶
- **Travel**: ✈️ 🚗 🏖️ ⛷️ 🌴 🏔️ 🌅 🌃
- **Activities**: ⛳ 🍻 🏟️ ⛺ 👯 🍷
- **Places**: 🏡 🏨 🏕️ 🎪 🛳️
- **Nature**: 🌊 🌲 🌸 ☀️ ❄️

---

## Integration: Create Trip Dialog

### `apps/web/src/components/trip/create-trip-dialog.tsx`

**Step 1 → Step 2 transition:**
1. User fills name + destination + dates
2. On "Next" click: run `detectTemplate(tripName)`
3. If detected: store template values (`themeColor`, `themeIcon`, `themeFont`) in form state
4. Proceed to Step 2

**Step 2:**
- If theme exists: show `ThemePreviewCard` (swatch + icon + name) with "Change theme" link
- "Change theme" opens `TemplatePicker` as sheet overlay
- If no theme: show "Add a theme" link → opens `TemplatePicker`
- `TemplatePicker` has Custom option with color palette + emoji grid + font radio
- Form state holds `themeColor`, `themeIcon`, `themeFont`
- Submit sends theme fields to API

---

## Integration: Trip Detail Page

### `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`

**Hero rendering:**

| State | Hero Background | Overlay | Title Font |
|-------|----------------|---------|------------|
| `themeColor` + no `coverImageUrl` | Gradient from `deriveTheme().heroGradient` + theme icon display | None | `THEME_FONTS[themeFont]` |
| `themeColor` + `coverImageUrl` | Cover photo | **Theme-tinted** overlay (theme color at ~60% opacity) | `THEME_FONTS[themeFont]` |
| No theme + `coverImageUrl` | Cover photo | Existing dark scrim (unchanged) | Current Playfair |
| No theme + no cover | Current default gradient (unchanged) | Existing behavior | Current Playfair |

**Accent overrides:**
When `themeColor` exists, set CSS custom properties on the trip page wrapper:

```tsx
style={{
  '--color-primary': themeColor,
  '--color-primary-foreground': deriveTheme(themeColor).accentForeground,
} as React.CSSProperties}
```

This overrides the global accent (#d1643d) for buttons, badges, and links within trip pages. Scoped to the trip detail wrapper div — dashboard and navigation keep global accent.

---

## Integration: Edit Trip Dialog

### `apps/web/src/components/trip/edit-trip-dialog.tsx`

Add theme section:
- `ThemePreviewCard` if theme exists, or "Add a theme" link
- "Change theme" opens `TemplatePicker`
- Theme fields included in update mutation
- Can clear theme (set all to null)

---

## Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Vitest | `color-utils.ts` (conversions, WCAG contrast, deriveTheme), `detect-template.ts` (keyword matching, ordering, no-match) |
| Integration | Vitest | Trip CRUD with theme fields (create with theme, update, clear, get returns theme) |
| E2E | Playwright | Theme selection during creation (auto-detect + custom), display on detail page, editing |
| Manual | Playwright CLI | Visual verification of hero states, template picker, accent overrides, font rendering |
