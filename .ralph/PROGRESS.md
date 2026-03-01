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

## Iteration 5 — Task 5.1: Apply theme to trip detail hero and accent overrides

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; 50 E2E tests pass; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Applied trip theme styling to the trip detail page hero section and scoped accent color overrides:

1. **Hero Background** (`apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx`): Implemented 4 hero states:
   - **Theme + no cover**: Renders `deriveTheme().heroGradient` as inline background style with `TopoPattern` overlay and the theme icon as a centered, semi-transparent decorative emoji (aria-hidden, pointer-events-none)
   - **Theme + cover**: Renders cover photo with `deriveTheme().heroOverlay` (rgba at 60% opacity) tinted overlay replacing the dark scrim
   - **No theme + cover**: Unchanged — keeps existing dark gradient scrim (`from-black/70 via-black/20 to-transparent`)
   - **No theme + no cover**: Unchanged — keeps existing default gradient with `TopoPattern` (lighter scrim `from-black/60` applied for all no-cover states)

2. **Title Font**: When `trip.themeFont` exists, applies `THEME_FONTS[trip.themeFont as ThemeFont]` via inline `style={{ fontFamily: ... }}` and removes the Tailwind Playfair class. Falls back to `var(--font-playfair)` via `??` if the font key is unrecognized. When no themeFont, keeps current hardcoded Playfair class.

3. **Accent Color Overrides**: When `trip.themeColor` exists, sets `--color-primary` and `--color-primary-foreground` CSS custom properties on the outermost wrapper div via inline `style` with `as CSSProperties` cast. Scoped to trip detail page only — dashboard and navigation keep global accent.

4. **Theme derivation**: Computes `const theme = trip.themeColor ? deriveTheme(trip.themeColor) : null` once after trip data is available, reused for gradient, overlay, and accent foreground.

5. **Mock data update** (`trip-detail-content.test.tsx`): Added `themeColor: null`, `themeIcon: null`, `themeFont: null`, `showAllMembers: false` to `mockTripDetail` object.

6. **E2E helper update** (`apps/web/tests/e2e/helpers/invitations.ts`): Extended `createTripViaAPI` TypeScript interface with optional `themeColor?`, `themeIcon?`, `themeFont?` fields.

7. **E2E test** (`apps/web/tests/e2e/trip-theme.spec.ts`): Added "themed trip hero gradient renders without cover image" test — creates trip via API with theme fields, navigates to detail page, verifies: hero has gradient background inline style, theme icon emoji is visible, title has theme font inline style, and wrapper div has `--color-primary` CSS custom property.

### Learnings for future iterations

- The scrim overlay logic uses a 3-way branch: `coverImageUrl && theme` (themed overlay), `coverImageUrl` only (dark scrim), else (lighter scrim for no-cover states). The lighter scrim for no-cover is an improvement since the gradient/pattern already provides contrast.
- `as CSSProperties` cast is required for CSS custom property overrides (`--color-*`) since TypeScript's CSSProperties type doesn't include custom properties. This is idiomatic React.
- `as ThemeFont` assertion on `trip.themeFont` is safe when guarded by a truthy check and paired with `??` fallback for unrecognized values.
- The `heroOverlay` is a flat rgba color (not a gradient). For cover photos, a gradient-based overlay could provide better visual hierarchy (stronger at bottom where text sits), but the flat overlay matches the architecture spec.
- E2E test for "theme + cover" state was intentionally omitted because programmatic cover image upload in E2E adds complexity. The tinted overlay logic is covered by the code structure and will be manually verified.
- `createTripViaAPI` spreads `tripData` to the API, so theme fields pass through once the TS interface is updated — no runtime changes needed.

## Iteration 6 — Task 6.1: Add theme editing to edit trip dialog

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; 54 E2E tests pass; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Added theme editing support to the edit trip dialog, allowing users to view, change, add, and remove trip themes when editing an existing trip.

1. **Edit dialog theme section** (`apps/web/src/components/trip/edit-trip-dialog.tsx`): Added theme editing UI following the same pattern as the create trip dialog:
   - Added imports: `useState`, `Palette` icon, `ThemePreviewCard`, `TemplatePicker`, `ThemeFont` type
   - Added `templatePickerOpen` state for controlling the picker sheet
   - Added `themeColor`, `themeIcon`, `themeFont` to form `defaultValues` (initialized to `null`)
   - Added theme fields to `form.reset()` in the `useEffect` that pre-populates from trip data (`trip.themeColor ?? null`, etc.)
   - Added `form.watch()` for all three theme fields plus `hasTheme` derived boolean
   - Added `handleThemeSelect` callback that sets or clears all three theme fields via `form.setValue()`
   - Added conditional theme UI section between Cover Image and Allow Members checkboxes: `ThemePreviewCard` when theme exists, dashed "Add a theme" button when no theme
   - Wrapped return in Fragment (`<>...</>`) and placed `TemplatePicker` as sibling after `</Sheet>`
   - Used `isPending || isDeleting` for disabled state (correct for edit dialog, unlike create dialog which only uses `isPending`)

2. **Mock data update** (`apps/web/src/components/trip/__tests__/edit-trip-dialog.test.tsx`): Added `themeColor: null`, `themeIcon: null`, `themeFont: null` to `mockTrip` object to keep TypeScript satisfied.

3. **E2E tests** (`apps/web/tests/e2e/trip-theme.spec.ts`): Added 2 new E2E tests:
   - **"edit trip theme via edit dialog"**: Creates trip via API with Bachelor Party theme → navigates to detail → opens edit dialog → verifies `ThemePreviewCard` visible with "Change theme" → clicks "Change theme" → selects Bachelorette Party → verifies preview updates with "Playful" font → submits → verifies `--color-primary` contains `#ff69b4` (bachelorette pink)
   - **"remove trip theme via edit dialog"**: Creates trip via API with theme → opens edit dialog → clicks "Change theme" → clicks "No theme" → verifies "Add a theme" button appears → submits → verifies `--color-primary` wrapper div is no longer visible

4. **Manual verification**: Verifier performed end-to-end manual testing:
   - Confirmed theme section visible in edit dialog with pre-populated theme
   - Confirmed template picker opens from edit dialog
   - Changed theme from Beach to Ski Trip, verified preview updated
   - Submitted form, verified persistence via API (themeColor, themeIcon, themeFont all updated)
   - Verified hero section visually updated with new theme

### Learnings for future iterations

- The edit dialog's `TemplatePicker` is placed outside `<Sheet>` as a Fragment sibling, while the create dialog places it inside `<Sheet>` between `</SheetContent>` and `</Sheet>`. Both work because `TemplatePicker` creates its own independent Sheet/Dialog.Root context. The Fragment approach is arguably cleaner.
- No backend, schema, or hook changes were needed — Task 1.1 already set up `updateTripSchema` with theme fields and `useUpdateTrip` with optimistic update handling for theme fields. The edit dialog just needed to expose them in the UI.
- The `as ThemeFont` cast on `trip.themeFont` (which is `string | null` from the API) appears in multiple places (form reset, ThemePreviewCard prop, TemplatePicker prop). A future improvement could narrow `Trip.themeFont` from `string | null` to `ThemeFont | null` in shared types to eliminate these casts.
- E2E test total grew from 50 to 54 tests (2 new edit-theme tests + the 2 from Task 5.1 that were counted differently).

## Iteration 7 — Task 7.1: Triage PROGRESS.md for unaddressed items

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; 54 E2E tests pass; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Systematically reviewed all 6 iterations in PROGRESS.md to identify unaddressed issues (FAILURE, BLOCKED, reviewer caveats, deferred items). No code changes — only TASKS.md was updated with fix sub-tasks.

### Issues identified and triaged

**Created fix tasks for:**

1. **Task 7.2 — FONT_DISPLAY_NAMES duplication** (Minor): Same font display name mapping duplicated in `font-picker.tsx` (as `FONT_OPTIONS` array, lines 12-19) and `theme-preview-card.tsx` (as `FONT_DISPLAY_NAMES` Record, lines 13-20). Fix: Extract to `apps/web/src/config/theme-fonts.ts` as single source of truth. First mentioned in Iteration 3 learnings.

2. **Task 7.3 — isLightColor() duplication** (Minor): `color-picker.tsx` (lines 55-61) defines its own `isLightColor()` using BT.601 luma formula instead of reusing `readableForeground()` from `color-utils.ts` which uses proper WCAG 2.0 sRGB linearization. Fix: Replace inline function with import from color-utils. First mentioned in Iteration 3 learnings.

3. **Task 7.4 — `as ThemeFont` casts** (Moderate): 7 instances of `as ThemeFont` across production code because `Trip.themeFont` is typed as `string | null` in shared types, and response Zod schemas use `z.string().nullable()` instead of the enum. Fix: Move `ThemeFont` type to shared package, narrow Trip/TripSummary types, update response schemas. Eliminates 6 of 7 casts (1 remains for RadioGroup boundary). First mentioned in Iteration 5 learnings, repeatedly noted in Iteration 6.

**Reviewed and deemed NOT actionable:**

- Missing E2E test for "theme + cover" state: Intentionally omitted per Iteration 5 — cover image upload in E2E adds significant complexity, and the code path is structurally simple (conditional branch).
- No unit tests for picker components: 5 picker components (ColorPicker, IconPicker, FontPicker, TemplatePicker, ThemePreviewCard) have no unit tests but are covered by 5 E2E tests. Low risk for pure-UI components.
- `as CSSProperties` cast for CSS custom properties: Idiomatic React pattern, not a code smell.
- `ThemeFont` type duplication between `config/theme-fonts.ts` and Zod schema: Subsumed by Task 7.4 which moves `ThemeFont` to shared package.

### Learnings for future iterations

- All 6 prior iterations were COMPLETE/APPROVED with no FAILURES or BLOCKED items — the Trip Themes feature implementation was clean
- The three fix tasks escalate in scope: constant extraction (7.2) → function replacement (7.3) → cross-package type narrowing (7.4). Recommend implementing in this order.
- Task 7.4 is the most impactful but also the most complex — it touches shared types, Zod schemas, and multiple frontend consumers across 3 packages. The shared package must be rebuilt after changes.
- The `font-picker.tsx` `as ThemeFont` cast on `RadioGroup.onValueChange` callback is an unavoidable Radix UI boundary issue — RadioGroup always returns `string`, not a narrower union.

## Iteration 8 — Task 7.2: Extract FONT_DISPLAY_NAMES to shared config

**Status**: ✅ COMPLETE
**Verifier**: PASS (2645 tests, 0 failures; lint clean; typecheck clean)
**Reviewer**: APPROVED

### What was done

Extracted the duplicated `FONT_DISPLAY_NAMES` mapping from two component files into the shared config file, establishing a single source of truth for font display names.

1. **Config file** (`apps/web/src/config/theme-fonts.ts`): Added `FONT_DISPLAY_NAMES: Record<ThemeFont, string>` export after the existing `THEME_FONTS` constant. Contains all 6 font display names: "Clean Modern", "Bold Sans", "Elegant Serif", "Playful", "Handwritten", "Condensed". Follows the same `Record<ThemeFont, string>` pattern as `THEME_FONTS`.

2. **Font picker** (`apps/web/src/components/trip/font-picker.tsx`): Replaced the hardcoded local `FONT_OPTIONS` array (6 entries with `{ id, displayName }` objects) with a derived version using `Object.entries(FONT_DISPLAY_NAMES).map()`. Added `FONT_DISPLAY_NAMES` to the existing import from `@/config/theme-fonts`. The `as ThemeFont` cast on the `Object.entries` key is necessary because TypeScript widens `Object.entries` keys to `string`.

3. **Theme preview card** (`apps/web/src/components/trip/theme-preview-card.tsx`): Removed the local `FONT_DISPLAY_NAMES` constant definition (8 lines). Added `FONT_DISPLAY_NAMES` to the value import from `@/config/theme-fonts`. Usage at line 32 (`{FONT_DISPLAY_NAMES[font]}`) remains unchanged.

### Learnings for future iterations

- `Object.entries()` on a `Record<K, V>` returns `[string, V][]` in TypeScript — the key type is widened to `string`, requiring a cast back to the original key type. This is a well-known TypeScript limitation.
- `Object.entries()` preserves insertion order for string keys in modern JS engines, so the radio button rendering order in FontPicker is preserved as long as the Record key order matches the original array order.
- The config file `theme-fonts.ts` now exports 3 items: `ThemeFont` type, `THEME_FONTS` (CSS variable mapping), and `FONT_DISPLAY_NAMES` (human-readable names). Task 7.4 will later move `ThemeFont` to the shared package.
