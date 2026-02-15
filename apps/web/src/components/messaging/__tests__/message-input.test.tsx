import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../message-input";

// Mock hooks
const mockMutate = vi.fn();
const mockCreateMessage = {
  mutate: mockMutate,
  isPending: false,
};

vi.mock("@/hooks/use-messages", () => ({
  useCreateMessage: () => mockCreateMessage,
  getCreateMessageErrorMessage: (error: Error | null) =>
    error?.message ?? null,
}));

vi.mock("@/app/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      displayName: "John Doe",
      profilePhotoUrl: null,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

describe("MessageInput", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockCreateMessage.isPending = false;
  });

  it("renders textarea with placeholder", () => {
    render(<MessageInput tripId="trip-1" />);

    expect(
      screen.getByPlaceholderText("Write a message..."),
    ).toBeDefined();
  });

  it("renders compact placeholder for reply inputs", () => {
    render(<MessageInput tripId="trip-1" compact />);

    expect(
      screen.getByPlaceholderText("Write a reply..."),
    ).toBeDefined();
  });

  it("shows disabled message when disabled", () => {
    render(
      <MessageInput
        tripId="trip-1"
        disabled
        disabledMessage="You have been muted"
      />,
    );

    expect(screen.getByText("You have been muted")).toBeDefined();
    expect(
      screen.queryByPlaceholderText("Write a message..."),
    ).toBeNull();
  });

  it("shows default disabled message when no custom message", () => {
    render(<MessageInput tripId="trip-1" disabled />);

    expect(screen.getByText("Messages are disabled")).toBeDefined();
  });

  it("renders send button", () => {
    render(<MessageInput tripId="trip-1" />);

    expect(screen.getByLabelText("Send message")).toBeDefined();
  });

  it("disables send button when content is empty", () => {
    render(<MessageInput tripId="trip-1" />);

    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).toHaveProperty("disabled", true);
  });

  it("enables send button when content is entered", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    await user.type(textarea, "Hello!");

    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).toHaveProperty("disabled", false);
  });

  it("calls createMessage.mutate when send button is clicked", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    await user.type(textarea, "Hello world");

    const sendButton = screen.getByLabelText("Send message");
    await user.click(sendButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { content: "Hello world", parentId: undefined },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("passes parentId for reply inputs", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" parentId="msg-1" compact />);

    const textarea = screen.getByPlaceholderText("Write a reply...");
    await user.type(textarea, "Reply text");

    const sendButton = screen.getByLabelText("Send message");
    await user.click(sendButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { content: "Reply text", parentId: "msg-1" },
      expect.any(Object),
    );
  });

  it("shows character count above threshold", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    // Type a long message above 1800 characters
    const longText = "a".repeat(1801);
    await user.click(textarea);
    // For performance, set value directly and trigger change
    // Instead of typing 1801 chars, we use fireEvent
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, longText);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // Trigger onChange via fireEvent approach
    await waitFor(() => {
      expect(screen.getByText(/1801\/2000/)).toBeDefined();
    });
  });

  it("does not show avatar in compact mode", () => {
    const { container } = render(
      <MessageInput tripId="trip-1" compact />,
    );

    const avatars = container.querySelectorAll('[data-slot="avatar"]');
    expect(avatars.length).toBe(0);
  });

  it("shows avatar in normal mode", () => {
    const { container } = render(<MessageInput tripId="trip-1" />);

    const avatars = container.querySelectorAll('[data-slot="avatar"]');
    expect(avatars.length).toBe(1);
  });
});
