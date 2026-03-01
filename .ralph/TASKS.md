# Tasks: Trip Themes

## Phase 1: Data Layer & API

- [x] Task 1.1: Add theme columns to DB, shared types/schemas, and API service
  - Implement: Add `themeColor` (varchar 7), `themeIcon` (varchar 10), `themeFont` (varchar 30) nullable columns to `trips` table in `apps/api/src/db/schema/index.ts`
  - Implement: Run `cd apps/api && pnpm db:generate` to create migration, review generated SQL
  - Implement: Run `cd apps/api && pnpm db:migrate` to apply migration
  - Implement: Add `themeColor`, `themeIcon`, `themeFont` fields to `Trip`, `TripSummary`, `TripDetail` interfaces in `shared/types/trip.ts`
  - Implement: Add theme Zod fields to `baseTripSchema` (create/update) in `shared/schemas/trip.ts` — regex-validated hex color, max-10 icon, enum font
  - Implement: Add theme fields to response schemas (`tripEntitySchema`, `tripSummarySchema`, `tripDetailSchema`) in `shared/schemas/trip.ts`
  - Implement: Update `createTrip()` in `apps/api/src/services/trip.service.ts` to accept and store theme fields
  - Implement: Update `getTripById()` to return theme fields in both full and preview responses
  - Implement: Update `getUserTrips()` to return theme fields in summaries
  - Implement: Update `updateTrip()` to accept theme field updates
  - Implement: Update `apps/web/src/hooks/use-trips.ts` to include theme fields in create/update mutation payloads
  - Test: Write integration tests for trip CRUD with theme fields — create with theme, update theme, clear theme (set null), get trip returns theme, existing trips return null theme
  - Verify: run full test suite, lint, and typecheck pass

## Phase 2: Frontend Foundations

- [x] Task 2.1: Implement color utilities and font setup
  - Implement: Create `apps/web/src/lib/color-utils.ts` — hexToHsl, hslToHex, darken, lighten, withAlpha, relativeLuminance, contrastRatio, readableForeground, deriveTheme. No external dependencies.
  - Implement: Add 4 new font imports (Oswald, Nunito, Caveat, Barlow_Condensed) to `apps/web/src/lib/fonts.ts` via `next/font/google`
  - Implement: Add new font CSS variables to root `<html>` className in `apps/web/src/app/layout.tsx`
  - Implement: Create `apps/web/src/config/theme-fonts.ts` — ThemeFont type and THEME_FONTS mapping (font ID → CSS variable)
  - Test: Write unit tests for `color-utils.ts` — hex↔HSL round-trip, darken/lighten bounds, WCAG contrast calculation, readableForeground picks white on dark bg and dark on light bg, deriveTheme returns valid CSS values
  - Verify: run full test suite, lint, and typecheck pass

## Phase 3: Template System & Pickers

- [x] Task 3.1: Build template config, keyword detection, and all picker components
  - Implement: Create `apps/web/src/config/trip-templates.ts` — TripTemplate interface and TRIP_TEMPLATES array (all 20 templates with id, label, keywords, color, icon, font). Ensure bachelorette before bachelor in array order.
  - Implement: Create `apps/web/src/lib/detect-template.ts` — `detectTemplate(name)` returns matching template or null
  - Implement: Create `apps/web/src/components/trip/template-picker.tsx` — sheet overlay with grid of 20 template cards (gradient backgrounds from deriveTheme, icon + label), "Custom" card, "No theme" option, selection callback
  - Implement: Create `apps/web/src/components/trip/color-picker.tsx` — grid of ~16 preset hex colors (deduplicated from templates + neutrals), selected state with checkmark
  - Implement: Create `apps/web/src/components/trip/icon-picker.tsx` — grid of ~35 curated travel/party emojis organized by category, selected state with ring
  - Implement: Create `apps/web/src/components/trip/font-picker.tsx` — 6 radio options, each rendering its name in its own font family
  - Implement: Create `apps/web/src/components/trip/theme-preview-card.tsx` — compact inline card (color swatch circle, icon, name, "Change theme" link)
  - Test: Write unit tests for `detect-template.ts` — matches exact keyword, matches substring, bachelorette doesn't match bachelor, no-match returns null, case-insensitive
  - Verify: run full test suite, lint, and typecheck pass

## Phase 4: Trip Creation Integration

- [x] Task 4.1: Integrate theme selection into create trip dialog
  - Implement: Update Step 1 → Step 2 transition in `apps/web/src/components/trip/create-trip-dialog.tsx` — on "Next" click, run `detectTemplate(tripName)`, store result in form state
  - Implement: Add theme form fields (`themeColor`, `themeIcon`, `themeFont`) to the create trip form state
  - Implement: On Step 2, if theme exists: show `ThemePreviewCard` with "Change theme" link that opens `TemplatePicker`
  - Implement: On Step 2, if no theme: show "Add a theme" link that opens `TemplatePicker`
  - Implement: Wire TemplatePicker selection callback to update form state (color, icon, font)
  - Implement: Ensure theme fields are submitted with trip creation
  - Test: Write E2E test — create trip with auto-detected template (type "Bachelor Party Trip", verify chip appears on step 2, submit, verify trip created with theme)
  - Test: Write E2E test — create trip with custom theme (skip template, open picker, select custom color/icon/font, submit)
  - Verify: run full test suite including E2E, lint, and typecheck pass
  - Verify: manual testing with screenshots — auto-detect flow, template picker grid, custom pickers

## Phase 5: Trip Detail Theming

- [x] Task 5.1: Apply theme to trip detail hero and accent overrides
  - Implement: Update hero section in `apps/web/src/app/(app)/trips/[id]/trip-detail-content.tsx` — when `themeColor` + no cover: render gradient from `deriveTheme().heroGradient` with theme icon display
  - Implement: When `themeColor` + cover image: replace dark scrim with theme-tinted overlay (theme color at ~60% opacity)
  - Implement: When `themeFont` exists: apply `THEME_FONTS[themeFont]` to trip title via inline style `fontFamily`
  - Implement: When no theme: keep existing behavior unchanged
  - Implement: Add CSS custom property overrides on trip page wrapper when `themeColor` exists — `--color-primary: themeColor`, `--color-primary-foreground: deriveTheme().accentForeground`
  - Implement: Verify accent override applies to buttons, badges, and links within trip detail (scoped to wrapper, not global)
  - Test: Write E2E test — navigate to themed trip, verify hero gradient renders (no cover), verify accent color applies
  - Test: Write E2E test — navigate to themed trip with cover image, verify tinted overlay
  - Verify: run full test suite including E2E, lint, and typecheck pass
  - Verify: manual testing with screenshots — all 4 hero states (theme+no cover, theme+cover, no theme+cover, no theme+no cover), accent override on buttons/badges, each font rendering

## Phase 6: Edit Trip

- [x] Task 6.1: Add theme editing to edit trip dialog
  - Implement: Add theme section to `apps/web/src/components/trip/edit-trip-dialog.tsx` — show `ThemePreviewCard` if theme exists, or "Add a theme" link
  - Implement: "Change theme" opens `TemplatePicker` sheet
  - Implement: Wire selection to form state, include theme fields in update mutation
  - Implement: Support clearing theme (set all to null) via "Remove theme" option in picker
  - Test: Write E2E test — edit existing trip to add/change/remove theme, verify changes persist
  - Verify: run full test suite including E2E, lint, and typecheck pass
  - Verify: manual testing with screenshots — theme editing flow

## Phase 7: Cleanup

- [x] Task 7.1: Triage PROGRESS.md for unaddressed items
  - Review: Read entire PROGRESS.md
  - Identify: Find FAILURE, BLOCKED, reviewer caveats, or deferred items across ALL phases
  - Fix: Create individual fix tasks in TASKS.md for each outstanding issue
  - Verify: run full test suite

- [x] Task 7.2: Extract FONT_DISPLAY_NAMES to shared config
  - Implement: Add `FONT_DISPLAY_NAMES: Record<ThemeFont, string>` to `apps/web/src/config/theme-fonts.ts` with all 6 font display names
  - Implement: Update `apps/web/src/components/trip/font-picker.tsx` to import `FONT_DISPLAY_NAMES` and derive `FONT_OPTIONS` array from it
  - Implement: Update `apps/web/src/components/trip/theme-preview-card.tsx` to import `FONT_DISPLAY_NAMES` from config instead of defining locally
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 7.3: Replace isLightColor() in ColorPicker with readableForeground()
  - Implement: In `apps/web/src/components/trip/color-picker.tsx`, replace `isLightColor()` with `readableForeground()` from `@/lib/color-utils`
  - Implement: Change `isLightColor(color) ? "text-gray-900" : "text-white"` to `readableForeground(color) === "#1a1a1a" ? "text-gray-900" : "text-white"`
  - Implement: Remove the `isLightColor()` function definition
  - Verify: run full test suite, lint, and typecheck pass

- [ ] Task 7.4: Narrow ThemeFont type through shared layer to eliminate casts
  - Implement: Add `ThemeFont` type to `shared/types/trip.ts` as string literal union of 6 font values
  - Implement: Update `Trip.themeFont` and `TripSummary.themeFont` types from `string | null` to `ThemeFont | null`
  - Implement: Update `tripEntitySchema` and `tripSummarySchema` in `shared/schemas/trip.ts` to use `.enum([...]).nullable()` instead of `z.string().nullable()` for themeFont
  - Implement: Remove `as ThemeFont` casts from `trip-detail-content.tsx`, `create-trip-dialog.tsx`, and `edit-trip-dialog.tsx` (keep the one in `font-picker.tsx` for RadioGroup boundary)
  - Implement: Update `apps/web/src/config/theme-fonts.ts` to import `ThemeFont` from `@tripful/shared/types` instead of defining locally
  - Verify: run full test suite, lint, and typecheck pass

## Phase 8: Final Verification

- [ ] Task 8.1: Full regression check
  - Verify: all unit tests pass (`pnpm test`)
  - Verify: all integration tests pass
  - Verify: all E2E tests pass (`pnpm test:e2e`)
  - Verify: linting passes (`pnpm lint`)
  - Verify: type checking passes (`pnpm typecheck`)
  - Verify: manual testing — theme selection in creation, detail page hero (all 4 states), accent overrides, edit theme, font rendering
