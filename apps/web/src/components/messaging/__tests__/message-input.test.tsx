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

  it("renders textarea with aria-label 'Write a message'", () => {
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByLabelText("Write a message");
    expect(textarea).toBeDefined();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("renders textarea with aria-label 'Write a reply' in compact mode", () => {
    render(<MessageInput tripId="trip-1" compact />);

    const textarea = screen.getByLabelText("Write a reply");
    expect(textarea).toBeDefined();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("has aria-describedby linking to char-count element", () => {
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByLabelText("Write a message");
    expect(textarea.getAttribute("aria-describedby")).toBe("char-count");

    const charCount = document.getElementById("char-count");
    expect(charCount).toBeDefined();
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

  it("shows character count above 1000 threshold", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    const longText = "a".repeat(1001);
    await user.click(textarea);
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, longText);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/1001\/2000/)).toBeDefined();
    });
  });

  it("does not show character count at or below 1000", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    const text = "a".repeat(1000);
    await user.click(textarea);
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await waitFor(() => {
      expect(screen.queryByText(/1000\/2000/)).toBeNull();
    });
  });

  it("shows warning color at 1800+ characters", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    const longText = "a".repeat(1800);
    await user.click(textarea);
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, longText);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await waitFor(() => {
      const charCount = screen.getByText(/1800\/2000/);
      expect(charCount).toBeDefined();
      expect(charCount.className).toContain("text-amber-600");
    });
  });

  it("shows destructive color at max length", async () => {
    const user = userEvent.setup();
    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    const longText = "a".repeat(2000);
    await user.click(textarea);
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(textarea, longText);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await waitFor(() => {
      const charCount = screen.getByText(/2000\/2000/);
      expect(charCount).toBeDefined();
      expect(charCount.className).toContain("text-destructive");
    });
  });

  it("sets transition to none when prefers-reduced-motion is enabled", async () => {
    const user = userEvent.setup();

    // Mock matchMedia to return reduced motion preference
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<MessageInput tripId="trip-1" />);

    const textarea = screen.getByPlaceholderText("Write a message...");
    await user.type(textarea, "Hello");

    expect(textarea.style.transition).toBe("none");
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
