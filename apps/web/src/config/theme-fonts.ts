export type ThemeFont =
  | "clean"
  | "bold-sans"
  | "elegant-serif"
  | "playful"
  | "handwritten"
  | "condensed";

export const THEME_FONTS: Record<ThemeFont, string> = {
  clean: "var(--font-plus-jakarta)",
  "bold-sans": "var(--font-oswald)",
  "elegant-serif": "var(--font-playfair)",
  playful: "var(--font-nunito)",
  handwritten: "var(--font-caveat)",
  condensed: "var(--font-barlow-condensed)",
};
