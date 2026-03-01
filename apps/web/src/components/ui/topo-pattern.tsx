import { cn } from "@/lib/utils";

/**
 * Decorative topographic contour-line SVG background pattern.
 * Renders at low opacity for use behind empty states.
 */
export function TopoPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 opacity-[0.06] pointer-events-none text-muted-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-20 180 C60 140, 140 200, 200 160 S340 120, 420 180"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M-20 200 C80 160, 160 220, 220 180 S360 140, 420 200"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-20 220 C60 190, 120 240, 200 210 S320 170, 420 220"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M-20 140 C40 110, 120 160, 200 120 S340 90, 420 140"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-20 260 C80 230, 160 270, 240 240 S360 210, 420 260"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
