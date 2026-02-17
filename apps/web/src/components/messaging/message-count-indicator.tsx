"use client";

import { useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { useMessageCount, useLatestMessage } from "@/hooks/use-messages";

interface MessageCountIndicatorProps {
  tripId: string;
}

export function MessageCountIndicator({ tripId }: MessageCountIndicatorProps) {
  const { data: count } = useMessageCount(tripId);
  const { data: latest } = useLatestMessage(tripId);

  const handleClick = useCallback(() => {
    const element = document.getElementById("discussion");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (count === undefined || count === 0) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      <span>
        {count} {count === 1 ? "message" : "messages"}
      </span>
      {latest && latest.deletedAt === null && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          — {latest.content}
        </span>
      )}
    </button>
  );
}
