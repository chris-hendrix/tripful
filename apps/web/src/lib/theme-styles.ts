import type { ThemePreset, ThemeBackground } from "@tripful/shared/types";
import {
  derivePaletteVariants,
  deriveDarkPaletteVariants,
} from "@tripful/shared/utils";

/**
 * Extract the base solid color from a ThemeBackground (first stop or solid).
 */
function getBaseColor(bg: ThemeBackground): string {
  if (bg.type === "solid") return bg.color;
  if (bg.type === "gradient") return bg.stops[0] ?? "#000000";
  return "#000000";
}

/**
 * Resolve a theme preset into CSS custom property overrides.
 * Includes both event palette colors and semantic UI tokens
 * (foreground, card, border, etc.) so the entire page adapts.
 *
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

  const derive = theme.background.isDark
    ? deriveDarkPaletteVariants
    : derivePaletteVariants;
  const travelV = derive(travel);
  const mealV = derive(meal);
  const activityV = derive(activity);
  const accommodationV = derive(accommodation);

  const baseColor = getBaseColor(theme.background);

  // Semantic UI tokens adapt to dark/light themes
  const semantic: Record<string, string> = theme.background.isDark
    ? {
        "--color-background": baseColor,
        "--color-foreground": "#e2e8f0",
        "--color-card": "rgba(255,255,255,0.06)",
        "--color-card-foreground": "#e2e8f0",
        "--color-popover": baseColor,
        "--color-popover-foreground": "#e2e8f0",
        "--color-secondary": "rgba(255,255,255,0.08)",
        "--color-secondary-foreground": "#e2e8f0",
        "--color-muted": "rgba(255,255,255,0.08)",
        "--color-muted-foreground": "#94a3b8",
        "--color-accent-foreground": "#e2e8f0",
        "--color-border": "rgba(255,255,255,0.10)",
        "--color-input": "rgba(255,255,255,0.12)",
        "--color-ring": highlight,
        // Member-travel (neutral gray) — defaults are light-mode, override for dark
        "--color-member-travel": "#9ca3af",
        "--color-member-travel-light": "#1f2937",
        "--color-member-travel-border": "#374151",
      }
    : {
        "--color-background": baseColor,
        "--color-foreground": "#1e293b",
        "--color-card": "rgba(255,255,255,0.70)",
        "--color-card-foreground": "#1e293b",
        "--color-popover": "#ffffff",
        "--color-popover-foreground": "#1e293b",
        "--color-secondary": "rgba(0,0,0,0.04)",
        "--color-secondary-foreground": "#1e293b",
        "--color-muted": "rgba(0,0,0,0.04)",
        "--color-muted-foreground": "#64748b",
        "--color-border": "rgba(0,0,0,0.08)",
        "--color-input": "rgba(0,0,0,0.10)",
        "--color-ring": highlight,
      };

  return {
    ...semantic,
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
 * Resolve only event palette CSS vars (no semantic UI tokens).
 * Used for locally-scoped theming (e.g. trip cards on the list page).
 */
export function resolvePaletteStyles(
  theme: ThemePreset | null,
): Record<string, string> {
  if (!theme) return {};

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
