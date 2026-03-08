// Curated theme presets for trip customization

import type { ThemePreset } from "../types/theme";

/**
 * Trip-type theme presets.
 * Each preset includes a background style, 5-color palette, default cover, and suggested font:
 *   [0] travel, [1] meal, [2] activity, [3] accommodation, [4] highlight
 *
 * All colors are hex values (never hsl — Tailwind v4 @theme bug).
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "impressionist-beach",
    name: "Impressionist Beach",
    tags: ["light", "beach"],
    palette: ["#2F7FA3", "#E88C6A", "#8EC6E8", "#1F3A4A", "#F2C14E"],
    background: {
      type: "gradient",
      angle: 160,
      stops: ["#F4E7C8", "#D4EEF6"],
      isDark: false,
    },
    defaultCoverUrl: "/themes/impressionist-beach-cover.webp",
    suggestedFont: "playfair",
  },
];

/**
 * Tuple of all theme preset IDs, suitable for use with z.enum().
 * Cast as non-empty tuple to satisfy Zod's requirement.
 */
export const THEME_IDS = THEME_PRESETS.map((t) => t.id) as [
  string,
  ...string[],
];
