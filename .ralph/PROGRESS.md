# Progress: Trip Themes

## Iteration 1 — Task 1.1: Add theme columns to DB, shared types/schemas, and API service

**Status**: ✅ COMPLETE
**Verifier**: PASS (2599 tests, 0 failures; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Added three nullable theme columns (`themeColor`, `themeIcon`, `themeFont`) to the trips table and threaded them through the entire stack:

1. **DB Schema** (`apps/api/src/db/schema/index.ts`): Added `theme_color` varchar(7), `theme_icon` varchar(10), `theme_font` varchar(30) — all nullable
2. **Migration** (`apps/api/src/db/migrations/0019_lush_marvex.sql`): Auto-generated and applied
3. **Shared Types** (`shared/types/trip.ts`): Added `themeColor`, `themeIcon`, `themeFont` as `string | null` to `Trip` and `TripSummary` interfaces (`TripDetail` extends `Trip`)
4. **Shared Schemas** (`shared/schemas/trip.ts`): Added to `baseTripSchema` (hex regex, max-10 icon, 6-value font enum, all `.nullable().optional()`), `tripEntitySchema`, and `tripSummarySchema` (both `.nullable()`)
5. **API Service** (`apps/api/src/services/trip.service.ts`): Updated `createTrip` values, `getTripById` preview, `getUserTrips` select+summary, local `TripSummary`/`TripPreview` types. `updateTrip` uses spread so theme fields flow automatically.
6. **Frontend Hooks** (`apps/web/src/hooks/use-trips.ts`): Added theme fields to optimistic updates in `useCreateTrip` (`?? null`) and `useUpdateTrip` (`!== undefined` pattern)
7. **Integration Tests** (`apps/api/tests/unit/trip-theme.test.ts`): 6 tests — create with theme, update theme, clear theme (null), get returns theme, list returns theme in summaries, existing trips return null

### Learnings for future iterations

- `updateTrip` uses `{...data}` spread — new fields matching Drizzle column names flow automatically (no explicit mapping needed like `timezone` → `preferredTimezone`)
- `getUserTrips` uses explicit `.select()` — new fields MUST be added there or they won't appear in summaries
- `getTripById` preview path manually picks fields — new fields must be added explicitly
- Fastify response schemas act as allowlists — fields not in `tripEntitySchema`/`tripSummarySchema` are silently stripped
- `TripSummary` type exists in BOTH `shared/types/trip.ts` and locally in `trip.service.ts` — both must be updated
- All commands run inside devcontainer via `make test-exec CMD="..."`

## Iteration 2 — Task 2.1: Implement color utilities and font setup

**Status**: ✅ COMPLETE
**Verifier**: PASS (2639 tests, 0 failures; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Created color conversion/manipulation utilities and set up 4 new Google fonts for the trip theme system:

1. **Color Utilities** (`apps/web/src/lib/color-utils.ts`): Created 9 exported pure functions — `hexToHsl`, `hslToHex`, `darken`, `lighten`, `withAlpha`, `relativeLuminance`, `contrastRatio`, `readableForeground`, `deriveTheme`. All outputs use hex or rgba() format (never hsl() to avoid Tailwind v4 @theme bug). WCAG 2.0 compliant luminance/contrast calculations with standard sRGB linearization.
2. **Font Imports** (`apps/web/src/lib/fonts.ts`): Added 4 new Google fonts via `next/font/google` — Oswald (`--font-oswald`), Nunito (`--font-nunito`), Caveat (`--font-caveat`), Barlow_Condensed (`--font-barlow-condensed` with explicit weight array `['400', '600', '700']`).
3. **Root Layout** (`apps/web/src/app/layout.tsx`): Added all 4 new font CSS variable classes to the root `<html>` element's `cn()` call.
4. **Font Config** (`apps/web/src/config/theme-fonts.ts`): New file with `ThemeFont` union type and `THEME_FONTS` record mapping 6 font IDs to CSS custom property references. Values match the Zod enum in `shared/schemas/trip.ts`.
5. **Unit Tests** (`apps/web/src/lib/__tests__/color-utils.test.ts`): 40 tests covering hex↔HSL conversions, round-trip fidelity, darken/lighten bounds, withAlpha, WCAG luminance/contrast, readableForeground on dark/light backgrounds, and deriveTheme output structure.

### Learnings for future iterations

- `apps/web/src/config/` directory is new — created for `theme-fonts.ts`, will hold `trip-templates.ts` in Task 3.1
- `ThemeFont` type is duplicated between `config/theme-fonts.ts` and the Zod schema in `shared/schemas/trip.ts` — kept separate per architecture spec, but they must stay in sync
- Barlow_Condensed is NOT a variable font — requires explicit `weight` array unlike Oswald/Nunito/Caveat
- `darken` uses multiplicative formula (`l * (1-amount)`) while `lighten` uses additive-toward-white (`l + (100-l) * amount`) — intentionally asymmetric for better gradient aesthetics
- `readableForeground` uses luminance threshold 0.179 (standard WCAG midpoint) to pick `#ffffff` or `#1a1a1a`
- Test file placed in `__tests__/` subdirectory pattern (consistent with newer tests in the codebase)

## Iteration 3 — Task 3.1: Build template config, keyword detection, and all picker components

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Built the frontend-only template system with 20 presets, keyword detection, and 5 picker UI components:

1. **Trip Templates** (`apps/web/src/config/trip-templates.ts`): `TripTemplate` interface and `TRIP_TEMPLATES` array with all 20 templates. `bachelorette-party` placed before `bachelor-party` for first-match-wins ordering. Each template has id, label, keywords array, hex color, emoji icon, and ThemeFont.
2. **Template Detection** (`apps/web/src/lib/detect-template.ts`): `detectTemplate(name)` function — case-insensitive substring matching via `.find()` + `.some()` + `.includes()`, returns matching `TripTemplate` or `null`.
3. **Template Picker** (`apps/web/src/components/trip/template-picker.tsx`): Sheet overlay with grid of 20 template cards (gradient backgrounds via `deriveTheme().heroGradient`, text via `accentForeground`). Internal custom mode with individual color/icon/font pickers. "No theme" option returns `null`. Clean controlled API: `open`/`onOpenChange`/`onSelect`.
4. **Color Picker** (`apps/web/src/components/trip/color-picker.tsx`): Grid of 23 preset colors (20 unique template colors + 3 neutrals) deduplicated via `Set`. Selected state with checkmark overlay. Helper `isLightColor()` for checkmark contrast.
5. **Icon Picker** (`apps/web/src/components/trip/icon-picker.tsx`): 31 curated emojis organized into 5 categories (Celebrations, Travel, Activities, Places, Nature). Selected state with ring highlight.
6. **Font Picker** (`apps/web/src/components/trip/font-picker.tsx`): 6 radio options using shadcn `RadioGroup`/`RadioGroupItem`. Each label rendered in its own font via `style={{ fontFamily: THEME_FONTS[fontId] }}`. Fixed `exactOptionalPropertyTypes` issue by using `value ?? ""` for null-to-empty-string conversion.
7. **Theme Preview Card** (`apps/web/src/components/trip/theme-preview-card.tsx`): Compact inline card with color swatch circle, emoji icon, font display name (rendered in its own font), and "Change theme" button.
8. **Unit Tests** (`apps/web/src/lib/__tests__/detect-template.test.ts`): 6 tests — exact keyword match, substring match, bachelorette-before-bachelor ordering, no-match returns null, case-insensitive, multi-word keywords.
9. **Barrel File** (`apps/web/src/components/trip/index.ts`): Added exports for all 5 new components.

### Learnings for future iterations

- `RadioGroup` from Radix has `value?: string` (optional). With `exactOptionalPropertyTypes: true`, you cannot pass `null` — use `value ?? ""` to convert null to empty string (no RadioGroupItem matches "", so nothing is selected)
- `FONT_DISPLAY_NAMES` record mapping ThemeFont IDs to human-readable names is duplicated between `font-picker.tsx` and `theme-preview-card.tsx` — consider extracting to shared config if more consumers appear
- `ColorPicker` has its own `isLightColor()` helper instead of reusing `readableForeground()` from `color-utils.ts` — the simple formula is adequate for checkmark overlay contrast
- All 20 template colors are unique (no deduplication needed), but `Set` is used defensively in case templates are modified later
- Sheet component from Radix unmounts children when closed, so `useState` initial values re-initialize each open — no stale state concern
- Template picker `onSelect` returns `{ color, icon, font } | null` — downstream consumers (Tasks 4.1, 6.1) will wire this to form state for `themeColor`/`themeIcon`/`themeFont`

## Iteration 4 — Task 4.1: Integrate theme selection into create trip dialog

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; 48 E2E tests pass; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Integrated the theme system into the create trip dialog with auto-detection and manual selection:

1. **Create Trip Dialog** (`apps/web/src/components/trip/create-trip-dialog.tsx`):
   - Added imports for `detectTemplate`, `ThemePreviewCard`, `TemplatePicker`, `ThemeFont`, and `Palette` icon
   - Added `templatePickerOpen` state for controlling the TemplatePicker Sheet overlay
   - Added `themeColor: null`, `themeIcon: null`, `themeFont: null` to form `defaultValues`
   - Added `form.watch()` for all three theme fields + derived `hasTheme` boolean
   - Updated `handleContinue` to run `detectTemplate(tripName)` after Step 1 validation, auto-filling theme fields only if no theme is already set (preserves manual selections on back-and-forth navigation)
   - Added `handleThemeSelect` callback that sets or clears all three theme fields via `form.setValue()`
   - Added theme section to Step 2 UI between Cover Image and Allow Members checkbox: shows `ThemePreviewCard` with "Change theme" button when theme is set, or dashed "Add a theme" button (with Palette icon) when no theme is set
   - Added `disabled={isPending}` to the "Add a theme" button for consistency with other Step 2 controls
   - Rendered `TemplatePicker` as a sibling to `SheetContent` inside the outer `Sheet` — stacks correctly via Radix portals

2. **E2E Tests** (`apps/web/tests/e2e/trip-theme.spec.ts`): 2 tests tagged `@regression`:
   - **Auto-detected template**: Creates trip named "Bachelor Party ..." → verifies `ThemePreviewCard` auto-appears on Step 2 ("Change theme" visible, "Add a theme" not visible) → submits and verifies trip creation
   - **Manual theme selection**: Creates trip named "Team Retreat ..." (no keyword match) → verifies "Add a theme" visible → opens TemplatePicker → selects "Bachelorette Party" template → verifies preview card appears → submits and verifies trip creation

### Learnings for future iterations

- `form.watch("themeColor")` returns `string | null | undefined` — use `?? null` when passing to components with `exactOptionalPropertyTypes` to convert `undefined` to `null`
- Auto-detection guard `!form.getValues("themeColor")` prevents overwriting manual selections when user navigates back to Step 1 and returns to Step 2
- Nested Sheets (create dialog Sheet + TemplatePicker Sheet) work correctly — Radix Dialog portals ensure independent z-stacking
- The `as ThemeFont` cast on `themeFont` inside the `hasTheme` guard is safe because the truthiness check eliminates `null`/`undefined`, leaving only valid `ThemeFont` union members
- E2E tests for cold-start Next.js compilation can be flaky on first run — `test.slow()` helps by extending the timeout
- Task 6.1 (edit trip dialog) will follow the same pattern: `handleThemeSelect`, `templatePickerOpen` state, conditional ThemePreviewCard/"Add a theme" rendering
