"use client";

import { toast } from "sonner";
import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUpdateRsvp,
  getUpdateRsvpErrorMessage,
} from "@/hooks/use-invitations";
import type { UpdateRsvpInput } from "@journiful/shared/schemas";
import { cn } from "@/lib/utils";

type RsvpStatus = "going" | "maybe" | "not_going" | "no_response";

const pills: {
  value: UpdateRsvpInput["status"];
  label: string;
  icon: typeof CircleCheck;
  activeClass: string;
}[] = [
  {
    value: "going",
    label: "Going",
    icon: CircleCheck,
    activeClass: "bg-success text-success-foreground hover:bg-success/90",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: CircleHelp,
    activeClass: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  {
    value: "not_going",
    label: "Not Going",
    icon: CircleX,
    activeClass:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
];

interface RsvpPillsProps {
  tripId: string;
  status: RsvpStatus;
}

export function RsvpPills({ tripId, status }: RsvpPillsProps) {
  const { mutate: updateRsvp, isPending } = useUpdateRsvp(tripId);

  const handleClick = (newStatus: UpdateRsvpInput["status"]) => {
    if (newStatus === status || isPending) return;
    updateRsvp(
      { status: newStatus },
      {
        onSuccess: () => {
          const label =
            pills.find((p) => p.value === newStatus)?.label ?? newStatus;
          toast.success(`RSVP updated to "${label}"`);
        },
        onError: (error) => {
          const message = getUpdateRsvpErrorMessage(error);
          toast.error(message ?? "Failed to update RSVP");
        },
      },
    );
  };

  return (
    <div className="flex gap-2">
      {pills.map((pill) => {
        const isActive = status === pill.value;
        const Icon = pill.icon;

        return (
          <Button
            key={pill.value}
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleClick(pill.value)}
            className={cn(
              "h-10",
              isActive && pill.activeClass,
              isActive && "border-transparent",
            )}
          >
            <Icon className="size-4" />
            {pill.label}
          </Button>
        );
      })}
    </div>
  );
}
