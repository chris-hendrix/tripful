"use client";

import { Info, CalendarDays, MessageCircle, Camera } from "lucide-react";

const ICONS = [
  { icon: Info, label: "Info" },
  { icon: CalendarDays, label: "Itinerary" },
  { icon: MessageCircle, label: "Messages" },
  { icon: Camera, label: "Photos" },
] as const;

interface IconStripProps {
  activeIndex: number;
  onIconClick: (index: number) => void;
}

export function IconStrip({ activeIndex, onIconClick }: IconStripProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-around bg-background/90 backdrop-blur-sm pt-safe h-[44px]">
      {ICONS.map(({ icon: Icon, label }, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onIconClick(index)}
            aria-label={label}
            aria-current={isActive ? "true" : undefined}
            className={`flex items-center justify-center w-10 h-10 transition-all ${
              isActive
                ? "text-accent-foreground scale-110"
                : "text-muted-foreground"
            }`}
          >
            <Icon
              className="w-5 h-5"
              strokeWidth={isActive ? 2.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}
