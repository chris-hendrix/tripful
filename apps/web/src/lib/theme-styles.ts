import type { ThemePreset, ThemeBackground } from "@tripful/shared/types";
import { derivePaletteVariants } from "@tripful/shared/utils";

/**
 * Resolve a theme preset into CSS custom property overrides.
 * Returns an empty object when no theme is provided, so downstream
 * components fall back to the global default colors defined in globals.css.
 */
export function resolveThemeStyles(
  theme: ThemePreset | null,
): Record<string, string> {
  if (!theme) return {};

  // Palette is always 5 entries: [travel, meal, activity, accommodation, highlight]
  const [travel, meal, activity, accommodation, highlight] = theme.palette as [
    string,
    string,
    string,
    string,
    string,
  ];

  const travelV = derivePaletteVariants(travel);
  const mealV = derivePaletteVariants(meal);
  const activityV = derivePaletteVariants(activity);
  const accommodationV = derivePaletteVariants(accommodation);

  return {
    "--color-event-travel": travel,
    "--color-event-travel-light": travelV.light,
    "--color-event-travel-border": travelV.border,
    "--color-event-meal": meal,
    "--color-event-meal-light": mealV.light,
    "--color-event-meal-border": mealV.border,
    "--color-event-activity": activity,
    "--color-event-activity-light": activityV.light,
    "--color-event-activity-border": activityV.border,
    "--color-accommodation": accommodation,
    "--color-accommodation-light": accommodationV.light,
    "--color-accommodation-border": accommodationV.border,
    "--color-primary": highlight,
  };
}

/**
 * Build a CSS background value from a ThemeBackground discriminated union.
 */
export function buildBackground(bg: ThemeBackground): string {
  switch (bg.type) {
    case "solid":
      return bg.color;
    case "gradient":
      return `linear-gradient(${bg.angle}deg, ${bg.stops.join(", ")})`;
    case "image":
      return `url(${bg.url}) center/cover`;
  }
}
