"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIP_TEMPLATES } from "@/config/trip-templates";

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
}

const NEUTRAL_COLORS = ["#000000", "#475569", "#94a3b8"];

const PRESET_COLORS = [
  ...new Set([
    ...TRIP_TEMPLATES.map((t) => t.color),
    ...NEUTRAL_COLORS,
  ]),
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {PRESET_COLORS.map((color) => {
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "relative size-8 rounded-full border-2 transition-all",
              isSelected
                ? "border-foreground scale-110"
                : "border-transparent hover:scale-110",
            )}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          >
            {isSelected && (
              <Check
                className={cn(
                  "absolute inset-0 m-auto size-4",
                  isLightColor(color) ? "text-gray-900" : "text-white",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}
