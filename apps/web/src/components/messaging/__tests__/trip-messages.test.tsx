import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TripMessages } from "../trip-messages";
import type {
  MessageWithReplies,
  GetMessagesResponse,
} from "@tripful/shared/types";

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
let intersectionCallback:
  | ((entries: { isIntersecting: boolean }[]) => void)
  | null = null;

class MockIntersectionObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    intersectionCallback = callback;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock data
const makeMessage = (
  overrides: Partial<MessageWithReplies> = {},
): MessageWithReplies => ({
  id: "msg-1",
  tripId: "trip-1",
  authorId: "user-1",
  parentId: null,
  content: "Hello world",
  isPinned: false,
  editedAt: null,
  deletedAt: null,
  createdAt: "2026-02-15T12:00:00Z",
  updatedAt: "2026-02-15T12:00:00Z",
  author: {
    id: "user-1",
    displayName: "John Doe",
    profilePhotoUrl: null,
  },
  reactions: [],
  replies: [],
  replyCount: 0,
  ...overrides,
});

// Mock return values
let mockData: GetMessagesResponse | undefined;
let mockIsPending = false;
let lastUseMessagesEnabled: boolean | undefined;
let lastUseMessagesLimit: number | undefined;

vi.mock("@/hooks/use-messages", () => ({
  useMessages: (_tripId: string, enabled?: boolean, limit?: number) => {
    lastUseMessagesEnabled = enabled;
    lastUseMessagesLimit = limit;
    return { data: mockData, isPending: mockIsPending };
  },
  useCreateMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleReaction: () => ({ mutate: vi.fn(), isPending: false }),
  useEditMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMessage: () => ({ mutate: vi.fn(), isPending: false }),
  usePinMessage: () => ({ mutate: vi.fn(), isPending: false }),
  getCreateMessageErrorMessage: () => null,
  getEditMessageErrorMessage: () => null,
  getDeleteMessageErrorMessage: () => null,
  getToggleReactionErrorMessage: () => null,
  getPinMessageErrorMessage: () => null,
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

describe("TripMessages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:05:00Z"));
    mockData = undefined;
    mockIsPending = false;
    lastUseMessagesEnabled = undefined;
    lastUseMessagesLimit = undefined;
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    intersectionCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders section header with Discussion title", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(screen.getByText("Discussion")).toBeDefined();
  });

  it("renders section with id=discussion for scroll targeting", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    const { container } = render(
      <TripMessages tripId="trip-1" isOrganizer={false} />,
    );

    expect(container.querySelector("#discussion")).not.toBeNull();
  });

  it("shows total count next to title", () => {
    mockData = {
      success: true,
      messages: [makeMessage()],
      meta: { total: 5, page: 1, limit: 20, totalPages: 1 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(screen.getByText("5")).toBeDefined();
  });

  it("shows loading skeleton when pending", () => {
    mockIsPending = true;
    const { container } = render(
      <TripMessages tripId="trip-1" isOrganizer={false} />,
    );

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no messages", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(
      screen.getByText("No messages yet. Start the conversation!"),
    ).toBeDefined();
  });

  it("renders message cards when messages exist", () => {
    mockData = {
      success: true,
      messages: [
        makeMessage({ id: "msg-1", content: "First message" }),
        makeMessage({ id: "msg-2", content: "Second message" }),
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(screen.getByText("First message")).toBeDefined();
    expect(screen.getByText("Second message")).toBeDefined();
  });

  it("shows disabled input message when trip is disabled", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} disabled />);

    expect(screen.getByText("Trip has ended")).toBeDefined();
  });

  it("shows muted message when user is muted", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} isMuted />);

    expect(screen.getByText("You have been muted")).toBeDefined();
  });

  it("shows message input when not disabled", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(screen.getByPlaceholderText("Write a message...")).toBeDefined();
  });

  it("does not show count when total is 0", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    // The only text content should be "Discussion" in the header area
    const header = screen.getByText("Discussion");
    expect(header.nextElementSibling).toBeNull();
  });

  it("renders section with aria-label 'Trip discussion'", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    const section = screen.getByRole("region", { name: "Trip discussion" });
    expect(section).toBeDefined();
  });

  it("sets aria-busy on feed div when loading", () => {
    mockIsPending = false;
    mockData = {
      success: true,
      messages: [makeMessage()],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };

    const { container } = render(
      <TripMessages tripId="trip-1" isOrganizer={false} />,
    );

    const feed = container.querySelector('[role="feed"]');
    expect(feed).not.toBeNull();
    expect(feed?.getAttribute("aria-busy")).toBe("false");
  });

  it("sets up IntersectionObserver on section element", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(mockObserve).toHaveBeenCalled();
  });

  it("passes visibility state to useMessages hook", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    // Initially isInView is true
    expect(lastUseMessagesEnabled).toBe(true);
  });

  it("shows 'Load earlier messages' button when more messages available", () => {
    mockData = {
      success: true,
      messages: [makeMessage({ id: "msg-1" })],
      meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(
      screen.getByRole("button", { name: "Load earlier messages" }),
    ).toBeDefined();
  });

  it("does not show 'Load earlier messages' when all messages loaded", () => {
    mockData = {
      success: true,
      messages: [makeMessage({ id: "msg-1" })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(
      screen.queryByRole("button", { name: "Load earlier messages" }),
    ).toBeNull();
  });

  it("increases limit when 'Load earlier messages' is clicked", () => {
    mockData = {
      success: true,
      messages: [makeMessage({ id: "msg-1" })],
      meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    // Initially limit should be PAGE_SIZE (20)
    expect(lastUseMessagesLimit).toBe(20);

    const button = screen.getByRole("button", {
      name: "Load earlier messages",
    });
    fireEvent.click(button);

    // After click, limit should increase to 40 (PAGE_SIZE * 2)
    expect(lastUseMessagesLimit).toBe(40);
  });

  it("does not show 'Load earlier messages' in empty state", () => {
    mockData = {
      success: true,
      messages: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };

    render(<TripMessages tripId="trip-1" isOrganizer={false} />);

    expect(
      screen.queryByRole("button", { name: "Load earlier messages" }),
    ).toBeNull();
  });
});
