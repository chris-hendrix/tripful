"use client";

import { useState } from "react";
import Image from "next/image";
import {
  UserPlus,
  Pencil,
  Settings,
} from "lucide-react";
import type { Accommodation } from "@tripful/shared/types";
import { THEME_PRESETS } from "@tripful/shared/config";
import { RsvpBadgeDropdown } from "@/components/trip/rsvp-badge-dropdown";
import { WeatherForecastCard } from "@/components/itinerary/weather-forecast-card";
import { AccommodationLineItem } from "@/components/itinerary/accommodation-line-item";
import { AccommodationDetailSheet } from "@/components/itinerary/accommodation-detail-sheet";
import { MessageCountIndicator } from "@/components/messaging";
import { CountdownBanner } from "./countdown-banner";
import { linkifyText } from "@/utils/linkify";
import { getUploadUrl } from "@/lib/api";
import { getInitials } from "@/lib/format";
import { supportsHover } from "@/lib/supports-hover";
import { useAccommodations } from "@/hooks/use-accommodations";
import type { TripDetailWithMeta } from "@/hooks/trip-queries";
import type { TripWeatherResponse, TemperatureUnit } from "@tripful/shared/types";

const preloadInviteMembersDialog = () =>
  void import("@/components/trip/invite-members-dialog");

const preloadEditTripDialog = () =>
  void import("@/components/trip/edit-trip-dialog");

const sectionHeaderClass =
  "text-xs uppercase tracking-wide font-medium text-muted-foreground";

interface InfoPanelProps {
  trip: TripDetailWithMeta;
  tripId: string;
  isOrganizer: boolean;
  activeEventCount: number;
  weather: TripWeatherResponse | undefined;
  weatherLoading: boolean;
  temperatureUnit: TemperatureUnit;
  currentMember: { id: string; userId: string; isMuted: boolean | undefined } | undefined;
  onOpenInvite: () => void;
  onOpenEdit: () => void;
  onOpenSettings: () => void;
  onOpenMembers: () => void;
  onNavigateToItinerary: () => void;
}

export function InfoPanel({
  trip,
  tripId,
  isOrganizer,
  activeEventCount,
  weather,
  weatherLoading,
  temperatureUnit,
  onOpenInvite,
  onOpenEdit,
  onOpenSettings,
  onOpenMembers,
  onNavigateToItinerary,
}: InfoPanelProps) {
  const preset = trip.themeId
    ? (THEME_PRESETS.find((p) => p.id === trip.themeId) ?? null)
    : null;

  const { data: accommodations } = useAccommodations(tripId);

  const [selectedAccommodation, setSelectedAccommodation] =
    useState<Accommodation | null>(null);

  return (
    <div className="px-4 pt-8 pb-2">
      {/* RSVP + action icons */}
      <div className="flex items-center mb-2">
        <RsvpBadgeDropdown
          tripId={trip.id}
          status={trip.userRsvpStatus}
        />
        <span className="flex-1" aria-hidden="true" />
        <div className="flex items-center gap-3">
          {isOrganizer && (
            <>
              <button
                onClick={onOpenInvite}
                onMouseEnter={
                  supportsHover ? preloadInviteMembersDialog : undefined
                }
                onTouchStart={preloadInviteMembersDialog}
                onFocus={preloadInviteMembersDialog}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Invite members"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenEdit}
                onMouseEnter={
                  supportsHover ? preloadEditTripDialog : undefined
                }
                onTouchStart={preloadEditTripDialog}
                onFocus={preloadEditTripDialog}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Edit trip"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={onOpenSettings}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Countdown (pre-trip only) */}
      <CountdownBanner
        startDate={trip.startDate}
        timezone={trip.preferredTimezone || "UTC"}
      />

      {/* Organizers + Stats (merged) */}
      <div className="py-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {trip.organizers.length > 0 && (
            <>
              <div className="flex -space-x-2">
                {trip.organizers.map((org) =>
                  org.profilePhotoUrl ? (
                    <Image
                      key={org.id}
                      src={getUploadUrl(org.profilePhotoUrl)!}
                      alt={org.displayName}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                    />
                  ) : (
                    <div
                      key={org.id}
                      className="w-6 h-6 rounded-full ring-2 ring-white bg-muted flex items-center justify-center text-[10px] font-medium text-foreground"
                    >
                      {getInitials(org.displayName)}
                    </div>
                  ),
                )}
              </div>
              <span>
                {trip.organizers.map((org) => org.displayName).join(", ")}
              </span>
              <span aria-hidden="true">&middot;</span>
            </>
          )}
          <button
            onClick={onOpenMembers}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {trip.memberCount} member{trip.memberCount !== 1 ? "s" : ""}
          </button>
          <span aria-hidden="true">&middot;</span>
          <button
            onClick={onNavigateToItinerary}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {activeEventCount === 0
              ? "No events yet"
              : `${activeEventCount} event${activeEventCount === 1 ? "" : "s"}`}
          </button>
          <MessageCountIndicator tripId={tripId} />
        </div>
      </div>

      {/* Accommodations */}
      {accommodations && accommodations.length > 0 && (
        <div className="py-4 border-t border-border">
          <h3 className={`${sectionHeaderClass} mb-3`}>Accommodations</h3>
          <div className="space-y-2">
            {accommodations.map((acc) => (
              <AccommodationLineItem
                key={acc.id}
                accommodation={acc}
                onClick={setSelectedAccommodation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weather */}
      <div className="py-4 border-t border-border">
        <h3 className={`${sectionHeaderClass} mb-3`}>Weather</h3>
        <WeatherForecastCard
          weather={weather}
          isLoading={weatherLoading}
          temperatureUnit={temperatureUnit}
          isDark={preset?.background.isDark ?? false}
        />
      </div>

      {/* About */}
      {trip.description && (
        <div className="py-4 border-t border-border">
          <h3 className={`${sectionHeaderClass} mb-3`}>About</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {linkifyText(trip.description)}
          </p>
        </div>
      )}

      {/* Accommodation detail sheet */}
      <AccommodationDetailSheet
        accommodation={selectedAccommodation}
        open={!!selectedAccommodation}
        onOpenChange={(open) => {
          if (!open) setSelectedAccommodation(null);
        }}
        timezone={trip.preferredTimezone || "UTC"}
        canEdit={false}
        canDelete={false}
        onEdit={() => {}}
        onDelete={() => setSelectedAccommodation(null)}
      />
    </div>
  );
}
