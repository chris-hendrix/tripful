import { Badge } from "@/components/ui/badge";

type RsvpStatus = "going" | "maybe" | "not_going" | "no_response";

interface RsvpBadgeProps {
  status: RsvpStatus;
  variant?: "default" | "overlay";
}

const defaultStyles: Record<RsvpStatus, string> = {
  going: "bg-success/15 text-success border-success/30",
  maybe: "bg-warning/15 text-warning border-warning/30",
  not_going: "bg-destructive/15 text-destructive border-destructive/30",
  no_response: "bg-muted text-muted-foreground border-border",
};

const overlayStyles: Record<RsvpStatus, string> = {
  going:
    "bg-black/50 backdrop-blur-md text-overlay-success border-white/20 shadow-sm",
  maybe:
    "bg-black/50 backdrop-blur-md text-overlay-warning border-white/20 shadow-sm",
  not_going:
    "bg-black/50 backdrop-blur-md text-overlay-muted border-white/20 shadow-sm",
  no_response: "",
};

const labels: Record<RsvpStatus, string> = {
  going: "Going",
  maybe: "Maybe",
  not_going: "Not Going",
  no_response: "No Response",
};

export function RsvpBadge({ status, variant = "default" }: RsvpBadgeProps) {
  if (variant === "overlay" && status === "no_response") {
    return null;
  }

  const className =
    variant === "overlay" ? overlayStyles[status] : defaultStyles[status];

  return <Badge className={className}>{labels[status]}</Badge>;
}
