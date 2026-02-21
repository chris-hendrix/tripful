import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageCountIndicator } from "../message-count-indicator";

// Mock hooks with controllable return values
let mockCount: number | undefined = 5;
let mockLatest: {
  id: string;
  content: string;
  deletedAt: string | null;
} | null = {
  id: "msg-1",
  content: "Latest message preview text",
  deletedAt: null,
};

vi.mock("@/hooks/use-messages", () => ({
  useMessageCount: () => ({ data: mockCount }),
  useLatestMessage: () => ({ data: mockLatest }),
}));

describe("MessageCountIndicator", () => {
  it("renders message count", () => {
    mockCount = 5;
    render(<MessageCountIndicator tripId="trip-1" />);

    expect(screen.getByText("5 messages")).toBeDefined();
  });

  it("shows singular form for 1 message", () => {
    mockCount = 1;
    render(<MessageCountIndicator tripId="trip-1" />);

    expect(screen.getByText("1 message")).toBeDefined();
  });

  it("shows latest message preview", () => {
    mockCount = 5;
    mockLatest = {
      id: "msg-1",
      content: "Latest message preview text",
      deletedAt: null,
    };
    render(<MessageCountIndicator tripId="trip-1" />);

    expect(screen.getByText(/Latest message preview text/)).toBeDefined();
  });

  it("does not show preview for deleted messages", () => {
    mockCount = 5;
    mockLatest = {
      id: "msg-1",
      content: "",
      deletedAt: "2026-02-15T12:00:00Z",
    };
    render(<MessageCountIndicator tripId="trip-1" />);

    expect(screen.getByText("5 messages")).toBeDefined();
    // Should not have the preview dash
    expect(screen.queryByText(/\u2014/)).toBeNull();
  });

  it("renders nothing when count is 0", () => {
    mockCount = 0;
    const { container } = render(<MessageCountIndicator tripId="trip-1" />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when count is undefined", () => {
    mockCount = undefined;
    const { container } = render(<MessageCountIndicator tripId="trip-1" />);

    expect(container.innerHTML).toBe("");
  });

  it("scrolls to discussion section on click", async () => {
    mockCount = 5;
    mockLatest = null;

    const mockScrollIntoView = vi.fn();
    const mockElement = { scrollIntoView: mockScrollIntoView };
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    const user = userEvent.setup();
    render(<MessageCountIndicator tripId="trip-1" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(document.getElementById).toHaveBeenCalledWith("discussion");
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });

    vi.restoreAllMocks();
  });
});
