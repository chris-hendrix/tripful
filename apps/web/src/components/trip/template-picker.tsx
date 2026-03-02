"use client";

import { useState } from "react";
import { Palette, X } from "lucide-react";
import type { ThemeFont } from "@/config/theme-fonts";
import { TRIP_TEMPLATES } from "@/config/trip-templates";
import { deriveTheme } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "./color-picker";
import { IconPicker } from "./icon-picker";
import { FontPicker } from "./font-picker";

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (theme: { color: string; icon: string; font: ThemeFont } | null) => void;
  currentColor?: string | null;
  currentIcon?: string | null;
  currentFont?: ThemeFont | null;
}

export function TemplatePicker({
  open,
  onOpenChange,
  onSelect,
  currentColor,
  currentIcon,
  currentFont,
}: TemplatePickerProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customColor, setCustomColor] = useState<string>(
    currentColor ?? "#3b82f6",
  );
  const [customIcon, setCustomIcon] = useState<string>(
    currentIcon ?? "\u{1F389}",
  );
  const [customFont, setCustomFont] = useState<ThemeFont>(
    currentFont ?? "clean",
  );

  function handleTemplateSelect(template: (typeof TRIP_TEMPLATES)[number]) {
    onSelect({ color: template.color, icon: template.icon, font: template.font });
    onOpenChange(false);
  }

  function handleNoTheme() {
    onSelect(null);
    onOpenChange(false);
  }

  function handleCustomDone() {
    onSelect({ color: customColor, icon: customIcon, font: customFont });
    setCustomMode(false);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCustomMode(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Choose a Theme</SheetTitle>
          <SheetDescription>
            Pick a template or build your own custom theme.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {customMode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Custom Theme</h3>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Color
                </p>
                <ColorPicker value={customColor} onChange={setCustomColor} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Icon
                </p>
                <IconPicker value={customIcon} onChange={setCustomIcon} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Font
                </p>
                <FontPicker value={customFont} onChange={setCustomFont} />
              </div>

              <Button onClick={handleCustomDone} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template grid */}
              <div className="grid grid-cols-2 gap-3">
                {TRIP_TEMPLATES.map((template) => {
                  const theme = deriveTheme(template.color);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-4 text-center transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: theme.heroGradient,
                        color: theme.accentForeground,
                      }}
                    >
                      <span className="text-2xl">{template.icon}</span>
                      <span className="text-xs font-medium leading-tight">
                        {template.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom option */}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                )}
              >
                <Palette className="size-4" />
                Custom
              </button>

              {/* No theme option */}
              <button
                type="button"
                onClick={handleNoTheme}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                No theme
              </button>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
