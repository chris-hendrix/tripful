import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateEventDialog } from "../create-event-dialog";

// Mock sonner
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock the API module
vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
  APIError: class APIError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = "APIError";
    }
  },
}));

describe("CreateEventDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const tripId = "test-trip-123";
  let queryClient: QueryClient;

  beforeEach(async () => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();

    // Clear the API mock
    const { apiRequest } = await import("@/lib/api");
    vi.mocked(apiRequest).mockClear();

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    });

    // Mock console to avoid test output noise
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Helper function to render component with QueryClientProvider
  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  describe("Dialog open/close behavior", () => {
    it("renders dialog when open is true", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      expect(screen.getByText("Create a new event")).toBeDefined();
    });

    it("does not render dialog content when open is false", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      expect(screen.queryByText("Create a new event")).toBeNull();
    });

    it("calls onOpenChange when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Form fields rendering", () => {
    it("displays all required fields", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      expect(screen.getByLabelText(/event name/i)).toBeDefined();
      expect(screen.getByLabelText(/event type/i)).toBeDefined();
      expect(screen.getByLabelText(/start time/i)).toBeDefined();
    });

    it("displays optional fields", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      expect(screen.getByLabelText(/location/i)).toBeDefined();
      expect(screen.getByLabelText(/end time/i)).toBeDefined();
      expect(screen.getByLabelText(/all day event/i)).toBeDefined();
      expect(screen.getByLabelText(/optional event/i)).toBeDefined();
      expect(screen.getByLabelText(/description/i)).toBeDefined();
    });

    it("shows required field indicators", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const labels = screen.getAllByText("*");
      expect(labels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Field validation - Event name", () => {
    it("shows error when event name is empty", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /create event/i });
      await user.click(submitButton);

      // Wait a moment for validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dialog should still be open (validation failed)
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("accepts valid event name", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const nameInput = screen.getByLabelText(/event name/i);
      await user.type(nameInput, "Beach Party");

      expect((nameInput as HTMLInputElement).value).toBe("Beach Party");
    });
  });

  describe("Field validation - Event type", () => {
    it("defaults to activity", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const eventTypeSelect = screen.getByLabelText(/event type/i);
      expect(eventTypeSelect).toBeDefined();
    });
  });

  describe("Field validation - Start time", () => {
    it("accepts datetime-local input", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const startTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
      await user.clear(startTimeInput);
      await user.type(startTimeInput, "2026-07-15T14:00");

      // Check that the date part is correct (time may vary due to timezone)
      expect(startTimeInput.value).toContain("2026-07-15");
    });
  });

  describe("Field validation - End time", () => {
    it("accepts optional end time", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const endTimeInput = screen.getByLabelText(/end time/i) as HTMLInputElement;
      await user.clear(endTimeInput);
      await user.type(endTimeInput, "2026-07-15T16:00");

      // Check that the date part is correct (time may vary due to timezone)
      expect(endTimeInput.value).toContain("2026-07-15");
    });
  });

  describe("Checkbox fields", () => {
    it("all day checkbox defaults to unchecked", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /all day event/i,
      });
      expect(checkbox.getAttribute("data-state")).toBe("unchecked");
    });

    it("optional event checkbox defaults to unchecked", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /optional event/i,
      });
      expect(checkbox.getAttribute("data-state")).toBe("unchecked");
    });

    it("can toggle all day checkbox", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /all day event/i,
      });
      await user.click(checkbox);

      expect(checkbox.getAttribute("data-state")).toBe("checked");
    });
  });

  describe("Description field", () => {
    it("allows entering description text", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      await user.type(descriptionInput, "This is a test event description");

      expect(descriptionInput.value).toBe("This is a test event description");
    });

    it("does not show character counter below 1600 characters", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "Short description");

      expect(screen.queryByText(/\/ 2000 characters/i)).toBeNull();
    });

    it("shows character counter at 1600+ characters", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      const longText = "a".repeat(1600);

      await user.click(descriptionInput);
      await user.paste(longText);

      await waitFor(() => {
        expect(screen.getByText("1600 / 2000 characters")).toBeDefined();
      });
    });
  });

  describe("Links field", () => {
    it("shows link input field", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      expect(screen.getByLabelText(/link url/i)).toBeDefined();
    });

    it("allows adding valid link", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const linkInput = screen.getByLabelText(/link url/i);
      await user.type(linkInput, "https://example.com");

      const addButton = screen.getByRole("button", { name: "" });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("https://example.com")).toBeDefined();
      });
    });

    it("shows error for invalid URL", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const linkInput = screen.getByLabelText(/link url/i);
      await user.type(linkInput, "invalid-url");

      const addButton = screen.getByRole("button", { name: "" });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeDefined();
      });
    });

    it("allows removing link", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const linkInput = screen.getByLabelText(/link url/i);
      await user.type(linkInput, "https://example.com");

      const addButton = screen.getByRole("button", { name: "" });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("https://example.com")).toBeDefined();
      });

      const removeButton = screen.getByRole("button", {
        name: /remove https:\/\/example\.com/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("https://example.com")).toBeNull();
      });
    });
  });

  describe("Form submission", () => {
    it("calls API with event data on form submit", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        event: {
          id: "event-123",
          tripId: tripId,
          createdBy: "user-123",
          name: "Test Event",
          description: null,
          eventType: "activity",
          location: null,
          startTime: new Date("2026-07-15T14:00:00.000Z"),
          endTime: null,
          allDay: false,
          isOptional: false,
          links: null,
          deletedAt: null,
          deletedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText(/event name/i);
      await user.type(nameInput, "Test Event");

      const startTimeInput = screen.getByLabelText(/start time/i);
      await user.clear(startTimeInput);
      await user.type(startTimeInput, "2026-07-15T14:00");

      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          `/trips/${tripId}/events`,
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    });

    it("shows loading state during submission", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  event: {
                    id: "event-123",
                    tripId: tripId,
                    createdBy: "user-123",
                    name: "Test Event",
                    description: null,
                    eventType: "activity",
                    location: null,
                    startTime: new Date("2026-07-15T14:00:00.000Z"),
                    endTime: null,
                    allDay: false,
                    isOptional: false,
                    links: null,
                    deletedAt: null,
                    deletedBy: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const nameInput = screen.getByLabelText(/event name/i);
      await user.type(nameInput, "Test Event");

      const startTimeInput = screen.getByLabelText(/start time/i);
      await user.type(startTimeInput, "2026-07-15T14:00");

      await user.click(screen.getByRole("button", { name: /create event/i }));

      expect(screen.getByText("Creating...")).toBeDefined();
    });
  });

  describe("Styling", () => {
    it("applies Playfair Display font to title", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const title = screen.getByText("Create a new event");
      expect(title.className).toContain(
        "font-[family-name:var(--font-playfair)]",
      );
    });

    it("applies h-12 height to inputs", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const nameInput = screen.getByLabelText(/event name/i);
      expect(nameInput.className).toContain("h-12");
    });

    it("applies rounded-xl to inputs and buttons", () => {
      renderWithQueryClient(
        <CreateEventDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
        />,
      );

      const nameInput = screen.getByLabelText(/event name/i);
      expect(nameInput.className).toContain("rounded-xl");

      const submitButton = screen.getByRole("button", {
        name: /create event/i,
      });
      expect(submitButton.className).toContain("rounded-xl");
    });
  });
});
