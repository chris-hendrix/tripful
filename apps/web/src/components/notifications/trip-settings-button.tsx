"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NotificationPreferences } from "./notification-preferences";

interface TripSettingsButtonProps {
  tripId: string;
}

export function TripSettingsButton({ tripId }: TripSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-lg"
        aria-label="Trip settings"
        onClick={() => setOpen(true)}
      >
        <Settings className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
              Trip settings
            </SheetTitle>
            <SheetDescription className="sr-only">
              Manage notification preferences and privacy settings for this trip
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <NotificationPreferences tripId={tripId} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
