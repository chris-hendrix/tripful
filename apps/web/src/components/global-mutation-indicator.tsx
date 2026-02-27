"use client";

import { useMutationState } from "@tanstack/react-query";

/**
 * A thin animated progress bar fixed at the top of the viewport
 * that appears whenever there are pending mutations.
 */
export function GlobalMutationIndicator() {
  const pendingMutations = useMutationState({
    filters: { status: "pending" },
  });

  if (pendingMutations.length === 0) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-label="Saving changes"
      className="fixed top-0 left-0 right-0 h-0.5 z-[45] overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 bg-primary motion-safe:animate-[mutation-slide_1.5s_ease-in-out_infinite]" />
    </div>
  );
}
