"use client";

import dynamic from "next/dynamic";

const PhotosSection = dynamic(
  () =>
    import("@/components/photos/photos-section").then((mod) => ({
      default: mod.PhotosSection,
    })),
  { ssr: false },
);

interface PhotosPanelProps {
  tripId: string;
  isOrganizer: boolean;
  disabled?: boolean;
}

export function PhotosPanel({
  tripId,
  isOrganizer,
  disabled,
}: PhotosPanelProps) {
  return (
    <div className="px-4 pb-safe">
      <PhotosSection
        tripId={tripId}
        isOrganizer={isOrganizer}
        disabled={disabled ?? false}
      />
    </div>
  );
}
