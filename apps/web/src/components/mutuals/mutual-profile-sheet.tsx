"use client";

import Link from "next/link";
import type { Mutual } from "@tripful/shared/types";
import { getUploadUrl } from "@/lib/api";
import { getInitials } from "@/lib/format";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MutualProfileSheetProps {
  mutual: Mutual | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MutualProfileSheet({
  mutual,
  open,
  onOpenChange,
}: MutualProfileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            {mutual?.displayName ?? ""}
          </SheetTitle>
          <SheetDescription>
            {mutual
              ? `${mutual.sharedTripCount} shared trip${mutual.sharedTripCount !== 1 ? "s" : ""}`
              : ""}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {mutual && (
            <div className="space-y-6 pb-6">
              {/* Large Avatar */}
              <div className="flex justify-center">
                <Avatar className="size-20 text-xl">
                  {mutual.profilePhotoUrl && (
                    <AvatarImage
                      src={getUploadUrl(mutual.profilePhotoUrl)}
                      alt={mutual.displayName}
                    />
                  )}
                  <AvatarFallback className="text-xl">
                    {getInitials(mutual.displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Shared Trips List */}
              {mutual.sharedTrips.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Shared Trips
                  </h3>
                  <ul className="space-y-1">
                    {mutual.sharedTrips.map((trip) => (
                      <li key={trip.id}>
                        <Link
                          href={`/trips/${trip.id}`}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          {trip.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
