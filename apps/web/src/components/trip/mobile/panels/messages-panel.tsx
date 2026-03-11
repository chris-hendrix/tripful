"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { TripMessages } from "@/components/messaging";

interface MessagesPanelProps {
  tripId: string;
  isOrganizer: boolean;
  disabled?: boolean;
  isMuted?: boolean;
}

export function MessagesPanel({
  tripId,
  isOrganizer,
  disabled,
  isMuted,
}: MessagesPanelProps) {
  return (
    <div className="px-4 pb-safe">
      <ErrorBoundary>
        <TripMessages
          tripId={tripId}
          isOrganizer={isOrganizer}
          disabled={disabled}
          isMuted={isMuted}
        />
      </ErrorBoundary>
    </div>
  );
}
