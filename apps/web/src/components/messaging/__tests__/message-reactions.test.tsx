import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageReactions } from "../message-reactions";
import type { ReactionSummary } from "@tripful/shared/types";

// Mock hooks
const mockMutate = vi.fn();
vi.mock("@/hooks/use-messages", () => ({
  useToggleReaction: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  getToggleReactionErrorMessage: (error: Error | null) =>
    error?.message ?? null,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

describe("MessageReactions", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  const baseReactions: ReactionSummary[] = [
    { emoji: "heart", count: 3, reacted: true },
    { emoji: "thumbs_up", count: 1, reacted: false },
  ];

  it("renders all 6 reaction buttons", () => {
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={[]}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(6);
  });

  it("shows count for reactions with count > 0", () => {
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={baseReactions}
      />,
    );

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("highlights active reactions", () => {
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={baseReactions}
      />,
    );

    const heartButton = screen.getByLabelText("React with heart");
    expect(heartButton.getAttribute("aria-pressed")).toBe("true");
    expect(heartButton.className).toContain("bg-primary/10");
  });

  it("does not highlight inactive reactions", () => {
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={baseReactions}
      />,
    );

    const thumbsUpButton = screen.getByLabelText("React with thumbs_up");
    expect(thumbsUpButton.getAttribute("aria-pressed")).toBe("false");
    expect(thumbsUpButton.className).toContain("bg-muted/50");
  });

  it("calls toggleReaction.mutate when a reaction button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={[]}
      />,
    );

    const heartButton = screen.getByLabelText("React with heart");
    await user.click(heartButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { messageId: "msg-1", data: { emoji: "heart" } },
      expect.any(Object),
    );
  });

  it("does not call mutate when disabled", async () => {
    const user = userEvent.setup();
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={[]}
        disabled
      />,
    );

    const heartButton = screen.getByLabelText("React with heart");
    await user.click(heartButton);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("applies disabled styling when disabled", () => {
    render(
      <MessageReactions
        messageId="msg-1"
        tripId="trip-1"
        reactions={[]}
        disabled
      />,
    );

    const heartButton = screen.getByLabelText("React with heart");
    expect(heartButton.className).toContain("opacity-50");
    expect(heartButton.className).toContain("cursor-not-allowed");
  });
});
