"use client";

import { useState, useEffect } from "react";
import { Plane, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemberTravels } from "@/hooks/use-member-travel";

interface TravelReminderBannerProps {
  tripId: string;
  memberId: string | undefined;
  onAddTravel: () => void;
}

function getDismissKey(tripId: string): string {
  return `tripful:onboarding-dismissed:${tripId}`;
}

export function TravelReminderBanner({
  tripId,
  memberId,
  onAddTravel,
}: TravelReminderBannerProps) {
  const { data: memberTravels } = useMemberTravels(tripId);
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismiss state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getDismissKey(tripId));
      if (stored === "true") {
        setDismissed(true);
      }
    } catch {
      // localStorage not available
    }
  }, [tripId]);

  // Check if current member already has an arrival entry
  const hasArrival = memberTravels?.some(
    (t) =>
      t.memberId === memberId && t.travelType === "arrival" && !t.deletedAt,
  );

  // Don't render if member has arrival, banner dismissed, or memberId not available
  if (hasArrival || dismissed || !memberId) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(getDismissKey(tripId), "true");
    } catch {
      // localStorage not available
    }
  };

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
      data-testid="travel-reminder-banner"
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-1">
              Add your travel details
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Let everyone know when you're arriving and departing so the group
              can plan accordingly.
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={onAddTravel}
                variant="gradient"
                size="sm"
                className="h-9 rounded-xl"
              >
                Add Travel Details
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl text-muted-foreground"
              >
                Dismiss
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
