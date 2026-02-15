"use client";

import { useCallback } from "react";
import {
  useToggleReaction,
  getToggleReactionErrorMessage,
} from "@/hooks/use-messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ReactionSummary, AllowedReaction } from "@tripful/shared/types";
import {
  ALLOWED_REACTIONS,
  REACTION_EMOJI_MAP,
} from "@tripful/shared/types";

interface MessageReactionsProps {
  messageId: string;
  tripId: string;
  reactions: ReactionSummary[];
  disabled?: boolean | undefined;
}

export function MessageReactions({
  messageId,
  tripId,
  reactions,
  disabled,
}: MessageReactionsProps) {
  const toggleReaction = useToggleReaction(tripId);

  const handleToggle = useCallback(
    (emoji: AllowedReaction) => {
      if (disabled || toggleReaction.isPending) return;

      toggleReaction.mutate(
        { messageId, data: { emoji } },
        {
          onError: (error) => {
            const message = getToggleReactionErrorMessage(error);
            toast.error(message ?? "Failed to toggle reaction");
          },
        },
      );
    },
    [messageId, disabled, toggleReaction],
  );

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reactions">
      {ALLOWED_REACTIONS.map((emoji) => {
        const reaction = reactions.find((r) => r.emoji === emoji);
        const isActive = reaction?.reacted ?? false;
        const count = reaction?.count ?? 0;

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji)}
            disabled={disabled}
            className={cn(
              "rounded-full px-2.5 py-1 text-sm border transition-colors inline-flex items-center gap-1",
              isActive
                ? "bg-primary/10 border-primary/30 text-primary motion-safe:animate-[reactionPop_200ms_ease-in-out]"
                : "bg-muted/50 border-transparent hover:bg-muted text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-label={`React with ${emoji}`}
            aria-pressed={isActive}
          >
            <span>{REACTION_EMOJI_MAP[emoji]}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
