// Curated theme presets for trip customization

import type { ThemePreset } from "../types/theme";

/**
 * 6 curated theme presets: 3 dark + 3 light.
 * Each preset includes a background style and 5-color palette:
 *   [0] travel, [1] meal, [2] activity, [3] accommodation, [4] highlight
 *
 * All colors are hex values (never hsl — Tailwind v4 @theme bug).
 */
export const THEME_PRESETS: ThemePreset[] = [
  // --- Dark themes ---
  {
    id: "midnight",
    name: "Midnight",
    tags: ["dark"],
    palette: ["#60a5fa", "#fbbf24", "#34d399", "#c084fc", "#f472b6"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#0f172a", "#1e293b"],
      isDark: true,
    },
  },
  {
    id: "noir",
    name: "Noir",
    tags: ["dark"],
    palette: ["#f9a8d4", "#fde68a", "#86efac", "#c4b5fd", "#fb7185"],
    background: {
      type: "solid",
      color: "#18181b",
      isDark: true,
    },
  },
  {
    id: "sunset-beach",
    name: "Sunset Beach",
    tags: ["dark"],
    palette: ["#38bdf8", "#fbbf24", "#34d399", "#e879f9", "#fb923c"],
    background: {
      type: "gradient",
      angle: 180,
      stops: ["#431407", "#7c2d12", "#1c1917"],
      isDark: true,
    },
  },

  // --- Light themes ---
  {
    id: "cloud",
    name: "Cloud",
    tags: ["light"],
    palette: ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#6366f1"],
    background: {
      type: "gradient",
      angle: 180,
      stops: ["#f8fafc", "#eef2ff"],
      isDark: false,
    },
  },
  {
    id: "cotton-candy",
    name: "Cotton Candy",
    tags: ["light"],
    palette: ["#818cf8", "#f472b6", "#34d399", "#a78bfa", "#ec4899"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fdf2f8", "#ede9fe", "#f0f9ff"],
      isDark: false,
    },
  },
  {
    id: "linen",
    name: "Linen",
    tags: ["light"],
    palette: ["#7c3aed", "#b45309", "#047857", "#9333ea", "#be185d"],
    background: {
      type: "solid",
      color: "#faf5f0",
      isDark: false,
    },
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
