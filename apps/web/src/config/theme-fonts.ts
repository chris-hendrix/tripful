import type { ThemeFont } from "@tripful/shared/types";

export type { ThemeFont };

export const THEME_FONTS: Record<ThemeFont, string> = {
  clean: "var(--font-plus-jakarta)",
  "bold-sans": "var(--font-oswald)",
  "elegant-serif": "var(--font-playfair)",
  playful: "var(--font-nunito)",
  handwritten: "var(--font-caveat)",
  condensed: "var(--font-barlow-condensed)",
};

export const FONT_DISPLAY_NAMES: Record<ThemeFont, string> = {
  clean: "Clean Modern",
  "bold-sans": "Bold Sans",
  "elegant-serif": "Elegant Serif",
  playful: "Playful",
  handwritten: "Handwritten",
  condensed: "Condensed",
};
