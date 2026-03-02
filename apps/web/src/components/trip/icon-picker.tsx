"use client";

import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
}

const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: "Celebrations",
    icons: [
      "\u{1F389}",
      "\u{1F382}",
      "\u{1F3B0}",
      "\u{1F485}",
      "\u{1F492}",
      "\u{1F91D}",
      "\u{1F3B6}",
    ],
  },
  {
    label: "Travel",
    icons: [
      "\u{2708}\u{FE0F}",
      "\u{1F697}",
      "\u{1F3D6}\u{FE0F}",
      "\u{26F7}\u{FE0F}",
      "\u{1F334}",
      "\u{1F3D4}\u{FE0F}",
      "\u{1F305}",
      "\u{1F303}",
    ],
  },
  {
    label: "Activities",
    icons: [
      "\u{26F3}",
      "\u{1F37B}",
      "\u{1F3DF}\u{FE0F}",
      "\u{26FA}",
      "\u{1F46F}",
      "\u{1F377}",
    ],
  },
  {
    label: "Places",
    icons: [
      "\u{1F3E1}",
      "\u{1F3E8}",
      "\u{1F3D5}\u{FE0F}",
      "\u{1F3AA}",
      "\u{1F6F3}\u{FE0F}",
    ],
  },
  {
    label: "Nature",
    icons: [
      "\u{1F30A}",
      "\u{1F332}",
      "\u{1F338}",
      "\u{2600}\u{FE0F}",
      "\u{2744}\u{FE0F}",
    ],
  },
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="space-y-3">
      {ICON_CATEGORIES.map((category) => (
        <div key={category.label}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {category.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {category.icons.map((icon) => {
              const isSelected = value === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onChange(icon)}
                  className={cn(
                    "flex items-center justify-center size-10 rounded-lg text-xl transition-all",
                    isSelected
                      ? "ring-2 ring-primary bg-primary/10 scale-110"
                      : "hover:bg-muted hover:scale-110",
                  )}
                  aria-label={`Select icon ${icon}`}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
