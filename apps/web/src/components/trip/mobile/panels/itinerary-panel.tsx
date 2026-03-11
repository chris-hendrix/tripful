"use client";

import { ItineraryView } from "@/components/itinerary/itinerary-view";
import type { DailyForecast, TemperatureUnit } from "@tripful/shared/types";

interface ItineraryPanelProps {
  tripId: string;
  onAddTravel?: () => void;
  forecasts?: DailyForecast[];
  temperatureUnit?: TemperatureUnit;
}

export function ItineraryPanel({
  tripId,
  onAddTravel,
  forecasts,
  temperatureUnit,
}: ItineraryPanelProps) {
  return (
    <ItineraryView
      tripId={tripId}
      {...(onAddTravel ? { onAddTravel } : {})}
      {...(forecasts ? { forecasts } : {})}
      {...(temperatureUnit ? { temperatureUnit } : {})}
    />
  );
}
