"use client";

import { type ThemeFont, THEME_FONTS } from "@/config/theme-fonts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface FontPickerProps {
  value: ThemeFont | null;
  onChange: (font: ThemeFont) => void;
}

const FONT_OPTIONS: { id: ThemeFont; displayName: string }[] = [
  { id: "clean", displayName: "Clean Modern" },
  { id: "bold-sans", displayName: "Bold Sans" },
  { id: "elegant-serif", displayName: "Elegant Serif" },
  { id: "playful", displayName: "Playful" },
  { id: "handwritten", displayName: "Handwritten" },
  { id: "condensed", displayName: "Condensed" },
];

export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(v) => onChange(v as ThemeFont)}
      className="grid gap-2"
    >
      {FONT_OPTIONS.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted",
          )}
        >
          <RadioGroupItem value={option.id} />
          <span
            className="text-sm"
            style={{ fontFamily: THEME_FONTS[option.id] }}
          >
            {option.displayName}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
