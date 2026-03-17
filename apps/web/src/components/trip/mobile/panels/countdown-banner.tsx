"use client";

import { useMemo } from "react";

interface CountdownBannerProps {
  startDate: string | null;
  timezone: string;
}

export function CountdownBanner({
  startDate,
  timezone,
}: CountdownBannerProps) {
  const message = useMemo(() => {
    if (!startDate) return null;

    // Get today in trip timezone
    const now = new Date();
    const todayInTz = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // "YYYY-MM-DD"

    const todayDate = new Date(todayInTz + "T00:00:00");
    const startDateOnly = startDate.slice(0, 10);
    const start = new Date(startDateOnly + "T00:00:00");

    // If today is on or after start date, hide countdown
    if (todayDate >= start) return null;

    const diffMs = start.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Starts today!";
    if (diffDays === 1) return "Starts tomorrow!";
    return `${diffDays} days until your trip!`;
  }, [startDate, timezone]);

  if (!message) return null;

  return (
    <div className="py-4 border-t border-border">
      <p className="text-sm font-medium text-primary">{message}</p>
    </div>
  );
}
