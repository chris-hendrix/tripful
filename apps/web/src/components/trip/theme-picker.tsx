"use client";

import { THEME_PRESETS } from "@tripful/shared/config";
import { buildBackground } from "@/lib/theme-styles";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface ThemePickerProps {
  value: string | null;
  onChange: (themeId: string | null) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border p-3">
      <div className="grid grid-cols-3 gap-2">
        {/* No theme option */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "h-20 rounded-lg overflow-hidden relative cursor-pointer",
            "flex flex-col items-center justify-center gap-1",
            "bg-muted border border-border",
            "transition-all",
            value === null &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          {value === null && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          <X className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">
            None
          </span>
        </button>

        {/* Theme presets — flat grid */}
        {THEME_PRESETS.map((preset) => {
          const isSelected = value === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              className={cn(
                "h-20 rounded-lg overflow-hidden relative cursor-pointer",
                "transition-all",
                isSelected &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              style={{ background: buildBackground(preset.background) }}
              title={preset.name}
            >
              {/* Theme name */}
              <span
                className={cn(
                  "absolute top-1.5 left-2 text-[10px] font-medium",
                  preset.background.isDark
                    ? "text-white/80"
                    : "text-black/60",
                )}
              >
                {preset.name}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}

              {/* Palette swatches */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                {preset.palette.map((color, i) => (
                  <div
                    key={i}
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
