"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  getUpdatePreferencesErrorMessage,
} from "@/hooks/use-notifications";

interface NotificationPreferencesProps {
  tripId: string;
}

const preferences = [
  {
    key: "dailyItinerary" as const,
    label: "Daily Itinerary",
    description: "Receive a summary of the day's events at 8am",
  },
  {
    key: "tripMessages" as const,
    label: "Trip Messages",
    description: "Get notified when someone posts a new message",
  },
];

export function NotificationPreferences({
  tripId,
}: NotificationPreferencesProps) {
  const { data: prefs, isLoading } = useNotificationPreferences(tripId);
  const updatePreferences = useUpdateNotificationPreferences(tripId);

  function handleToggle(
    key: "dailyItinerary" | "tripMessages",
    checked: boolean,
  ) {
    if (!prefs) return;

    updatePreferences.mutate(
      {
        dailyItinerary: prefs.dailyItinerary,
        tripMessages: prefs.tripMessages,
        [key]: checked,
      },
      {
        onSuccess: () => {
          toast.success("Preferences updated");
        },
        onError: (error) => {
          const message = getUpdatePreferencesErrorMessage(error);
          toast.error(message ?? "Failed to update preferences");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {preferences.map((pref, index) => (
        <div key={pref.key}>
          <div className="flex items-center justify-between py-4">
            <div className="space-y-1 pr-4">
              <Label htmlFor={`pref-${pref.key}`} className="text-sm font-medium">
                {pref.label}
              </Label>
              <p className="text-sm text-muted-foreground">{pref.description}</p>
            </div>
            <Switch
              id={`pref-${pref.key}`}
              checked={prefs?.[pref.key] ?? true}
              onCheckedChange={(checked) => handleToggle(pref.key, checked)}
              aria-label={pref.label}
            />
          </div>
          {index < preferences.length - 1 && <Separator />}
        </div>
      ))}
      <p className="mt-4 text-xs text-muted-foreground">
        Notifications are sent in-app and via SMS to your phone number.
      </p>
    </div>
  );
}
