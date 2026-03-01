"use client";

import type { ThemeFont } from "@/config/theme-fonts";
import { THEME_FONTS } from "@/config/theme-fonts";

interface ThemePreviewCardProps {
  color: string;
  icon: string;
  font: ThemeFont;
  onChangeClick: () => void;
}

const FONT_DISPLAY_NAMES: Record<ThemeFont, string> = {
  clean: "Clean Modern",
  "bold-sans": "Bold Sans",
  "elegant-serif": "Elegant Serif",
  playful: "Playful",
  handwritten: "Handwritten",
  condensed: "Condensed",
};

export function ThemePreviewCard({
  color,
  icon,
  font,
  onChangeClick,
}: ThemePreviewCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
      <div
        className="size-8 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span
        className="text-sm text-muted-foreground truncate"
        style={{ fontFamily: THEME_FONTS[font] }}
      >
        {FONT_DISPLAY_NAMES[font]}
      </span>
      <button
        type="button"
        onClick={onChangeClick}
        className="ml-auto text-sm text-primary hover:underline shrink-0"
      >
        Change theme
      </button>
    </div>
  );
}
