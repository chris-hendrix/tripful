"use client";

import { POSTCARD_LAYOUTS } from "@tripful/shared/config";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface LayoutPickerProps {
  value: string | null;
  onChange: (layoutId: string | null) => void;
}

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="space-y-2">
      {/* None option */}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "w-full rounded-lg border p-3 cursor-pointer text-left transition-all",
          value === null
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/30",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">None</p>
              <p className="text-xs text-muted-foreground">
                Default card style without decorations
              </p>
            </div>
          </div>
          {value === null && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-2">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* Layout options */}
      {POSTCARD_LAYOUTS.map((layout) => {
        const isSelected = value === layout.id;

        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(isSelected ? null : layout.id)}
            className={cn(
              "w-full rounded-lg border p-3 cursor-pointer text-left transition-all",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mini preview showing the attachment icon */}
                <div className="w-10 h-10 rounded-md bg-muted relative flex items-center justify-center overflow-visible">
                  {layout.attachment.type === "pushpin" && (
                    <div className="pushpin absolute -top-1 left-1/2 -translate-x-1/2" />
                  )}
                  {/* Mini card shape */}
                  <div className="w-7 h-5 rounded-sm bg-card border border-border shadow-sm" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {layout.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {layout.attachment.type === "pushpin" && "Pushpin attachment"}
                    {layout.attachment.type === "tape" && "Tape attachment"}
                    {layout.attachment.type === "magnet" && "Magnet attachment"}
                    {layout.attachment.type === "clip" && "Paper clip attachment"}
                    {layout.decorations && layout.decorations.length > 0 && (
                      <span>
                        {" "}
                        with{" "}
                        {layout.decorations
                          .map((d) =>
                            d.type === "postmark"
                              ? "postmark"
                              : d.type === "airmail-stripe"
                                ? "airmail stripe"
                                : d.type,
                          )
                          .join(" & ")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
