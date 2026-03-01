import { TRIP_TEMPLATES, type TripTemplate } from "@/config/trip-templates";

export function detectTemplate(name: string): TripTemplate | null {
  const lower = name.toLowerCase();
  return (
    TRIP_TEMPLATES.find((t) =>
      t.keywords.some((kw) => lower.includes(kw)),
    ) ?? null
  );
}
