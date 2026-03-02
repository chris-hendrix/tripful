// Curated theme presets for trip customization

import type { ThemePreset } from "../types/theme";

/**
 * ~20 curated theme presets spanning multiple visual categories.
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
    tags: ["dark", "city"],
    palette: ["#60a5fa", "#fbbf24", "#34d399", "#c084fc", "#f472b6"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#0f172a", "#1e293b"],
      isDark: true,
    },
  },
  {
    id: "deep-ocean",
    name: "Deep Ocean",
    tags: ["dark", "cool"],
    palette: ["#38bdf8", "#fb923c", "#2dd4bf", "#a78bfa", "#22d3ee"],
    background: {
      type: "gradient",
      angle: 180,
      stops: ["#0c1426", "#0e2a47", "#0a1628"],
      isDark: true,
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    tags: ["dark", "nature", "bold"],
    palette: ["#67e8f9", "#fcd34d", "#6ee7b7", "#d8b4fe", "#a78bfa"],
    background: {
      type: "gradient",
      angle: 160,
      stops: ["#0f172a", "#1a2e44", "#162e2e"],
      isDark: true,
    },
  },
  {
    id: "noir",
    name: "Noir",
    tags: ["dark", "city", "bold"],
    palette: ["#f9a8d4", "#fde68a", "#86efac", "#c4b5fd", "#fb7185"],
    background: {
      type: "solid",
      color: "#18181b",
      isDark: true,
    },
  },

  // --- Light themes ---
  {
    id: "cotton-candy",
    name: "Cotton Candy",
    tags: ["light", "pastel"],
    palette: ["#818cf8", "#f472b6", "#34d399", "#a78bfa", "#ec4899"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fdf2f8", "#ede9fe", "#f0f9ff"],
      isDark: false,
    },
  },
  {
    id: "vanilla",
    name: "Vanilla",
    tags: ["light", "warm"],
    palette: ["#2563eb", "#d97706", "#059669", "#9333ea", "#e11d48"],
    background: {
      type: "solid",
      color: "#fefce8",
      isDark: false,
    },
  },
  {
    id: "cloud",
    name: "Cloud",
    tags: ["light", "cool"],
    palette: ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#6366f1"],
    background: {
      type: "gradient",
      angle: 180,
      stops: ["#f8fafc", "#eef2ff"],
      isDark: false,
    },
  },
  {
    id: "linen",
    name: "Linen",
    tags: ["light", "warm", "vintage"],
    palette: ["#7c3aed", "#b45309", "#047857", "#9333ea", "#be185d"],
    background: {
      type: "solid",
      color: "#faf5f0",
      isDark: false,
    },
  },
  {
    id: "paper",
    name: "Paper",
    tags: ["light", "cool"],
    palette: ["#2563eb", "#ea580c", "#0d9488", "#7c3aed", "#0284c7"],
    background: {
      type: "solid",
      color: "#f8fafc",
      isDark: false,
    },
  },

  // --- Nature / Earthy themes ---
  {
    id: "forest",
    name: "Forest",
    tags: ["dark", "nature", "earthy"],
    palette: ["#86efac", "#fbbf24", "#5eead4", "#c084fc", "#4ade80"],
    background: {
      type: "gradient",
      angle: 170,
      stops: ["#14261c", "#1a3a2a"],
      isDark: true,
    },
  },
  {
    id: "desert",
    name: "Desert",
    tags: ["light", "nature", "earthy", "warm"],
    palette: ["#0369a1", "#c2410c", "#15803d", "#7e22ce", "#dc2626"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fef3c7", "#fed7aa", "#fef3c7"],
      isDark: false,
    },
  },
  {
    id: "moss",
    name: "Moss",
    tags: ["light", "nature", "earthy"],
    palette: ["#1d4ed8", "#ca8a04", "#15803d", "#6d28d9", "#059669"],
    background: {
      type: "gradient",
      angle: 160,
      stops: ["#f0fdf4", "#ecfdf5"],
      isDark: false,
    },
  },
  {
    id: "clay",
    name: "Clay",
    tags: ["light", "earthy", "warm"],
    palette: ["#1e40af", "#92400e", "#166534", "#7e22ce", "#b91c1c"],
    background: {
      type: "gradient",
      angle: 145,
      stops: ["#fef2f2", "#fef9ee"],
      isDark: false,
    },
  },

  // --- Beach / Tropical themes ---
  {
    id: "turquoise-coast",
    name: "Turquoise Coast",
    tags: ["light", "beach", "tropical"],
    palette: ["#0284c7", "#ea580c", "#0d9488", "#7c3aed", "#0891b2"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#ecfeff", "#cffafe", "#e0f2fe"],
      isDark: false,
    },
  },
  {
    id: "sunset-beach",
    name: "Sunset Beach",
    tags: ["dark", "beach", "warm"],
    palette: ["#38bdf8", "#fbbf24", "#34d399", "#e879f9", "#fb923c"],
    background: {
      type: "gradient",
      angle: 180,
      stops: ["#431407", "#7c2d12", "#1c1917"],
      isDark: true,
    },
  },
  {
    id: "lagoon",
    name: "Lagoon",
    tags: ["light", "beach", "tropical", "cool"],
    palette: ["#0369a1", "#d97706", "#047857", "#7c3aed", "#0e7490"],
    background: {
      type: "gradient",
      angle: 150,
      stops: ["#f0fdfa", "#ccfbf1"],
      isDark: false,
    },
  },
  {
    id: "coral-reef",
    name: "Coral Reef",
    tags: ["light", "beach", "tropical", "warm"],
    palette: ["#0284c7", "#c2410c", "#0d9488", "#9333ea", "#e11d48"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fff1f2", "#ffe4e6", "#fce7f3"],
      isDark: false,
    },
  },

  // --- Bold / Vibrant themes ---
  {
    id: "neon",
    name: "Neon",
    tags: ["dark", "bold", "city"],
    palette: ["#22d3ee", "#facc15", "#4ade80", "#e879f9", "#f43f5e"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#18181b", "#27272a"],
      isDark: true,
    },
  },
  {
    id: "carnival",
    name: "Carnival",
    tags: ["light", "bold", "festive"],
    palette: ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fef9c3", "#fef3c7", "#ffedd5"],
      isDark: false,
    },
  },
  {
    id: "electric",
    name: "Electric",
    tags: ["dark", "bold"],
    palette: ["#06b6d4", "#eab308", "#22c55e", "#d946ef", "#f97316"],
    background: {
      type: "gradient",
      angle: 145,
      stops: ["#0a0a0a", "#1a1a2e"],
      isDark: true,
    },
  },

  // --- Pastel / Soft themes ---
  {
    id: "lavender",
    name: "Lavender",
    tags: ["light", "pastel", "cool"],
    palette: ["#6366f1", "#e879f9", "#14b8a6", "#8b5cf6", "#a855f7"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#f5f3ff", "#ede9fe"],
      isDark: false,
    },
  },
  {
    id: "peach",
    name: "Peach",
    tags: ["light", "pastel", "warm"],
    palette: ["#3b82f6", "#f97316", "#10b981", "#a855f7", "#f43f5e"],
    background: {
      type: "gradient",
      angle: 145,
      stops: ["#fff7ed", "#fef3c7"],
      isDark: false,
    },
  },

  // --- Festive / Seasonal themes ---
  {
    id: "winter-lodge",
    name: "Winter Lodge",
    tags: ["dark", "snow", "festive", "cool"],
    palette: ["#93c5fd", "#fcd34d", "#6ee7b7", "#d8b4fe", "#f9a8d4"],
    background: {
      type: "gradient",
      angle: 160,
      stops: ["#1e293b", "#334155"],
      isDark: true,
    },
  },
  {
    id: "holiday",
    name: "Holiday",
    tags: ["light", "festive", "warm"],
    palette: ["#1d4ed8", "#dc2626", "#15803d", "#9333ea", "#b91c1c"],
    background: {
      type: "gradient",
      angle: 135,
      stops: ["#fef2f2", "#f0fdf4"],
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
