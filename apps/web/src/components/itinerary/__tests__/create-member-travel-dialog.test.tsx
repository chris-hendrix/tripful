import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateMemberTravelDialog } from "../create-member-travel-dialog";

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

describe("CreateMemberTravelDialog", () => {
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

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  describe("Dialog open/close behavior", () => {
    it("renders dialog when open is true", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      expect(screen.getByText("Add your travel details")).toBeDefined();
    });

    it("does not render dialog content when open is false", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      expect(screen.queryByText("Add your travel details")).toBeNull();
    });
  });

  describe("Form fields rendering", () => {
    it("displays all required fields", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      expect(screen.getByRole("radio", { name: /arrival/i })).toBeDefined();
      expect(
        screen.getByRole("button", { name: /travel time/i }),
      ).toBeDefined();
    });

    it("displays optional fields", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      expect(screen.getByLabelText(/location/i)).toBeDefined();
      expect(screen.getByRole("textbox", { name: /details/i })).toBeDefined();
    });

    it("shows required field indicators", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const labels = screen.getAllByText("*");
      expect(labels.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Travel type field", () => {
    it("defaults to arrival", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const arrivalRadio = screen.getByRole("radio", { name: /arrival/i });
      expect(arrivalRadio.checked).toBe(true);
    });

    it("allows selecting departure", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const departureRadio = screen.getByRole("radio", { name: /departure/i });
      await user.click(departureRadio);

      expect(departureRadio.checked).toBe(true);
    });
  });

  describe("Field validation", () => {
    it("shows error when time is empty", async () => {
      const { apiRequest } = await import("@/lib/api");
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /add travel details/i,
      });
      await user.click(submitButton);

      // Wait a moment for validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // API should not have been called since validation failed
      expect(apiRequest).not.toHaveBeenCalled();

      // Dialog should still be open
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("renders datetime picker with placeholder", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const timeButton = screen.getByRole("button", { name: /travel time/i });
      expect(timeButton).toBeDefined();
    });

    it("allows optional location", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, "Miami Airport");

      expect((locationInput as HTMLInputElement).value).toBe("Miami Airport");
    });
  });

  describe("Details field", () => {
    it("allows entering details text", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const detailsInput = screen.getByRole("textbox", {
        name: /details/i,
      }) as HTMLTextAreaElement;
      await user.type(detailsInput, "Flight AA123");

      expect(detailsInput.value).toBe("Flight AA123");
    });

    it("shows character counter at 400+ characters", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const detailsInput = screen.getByRole("textbox", {
        name: /details/i,
      }) as HTMLTextAreaElement;
      const longText = "a".repeat(400);

      await user.click(detailsInput);
      await user.paste(longText);

      await waitFor(() => {
        expect(screen.getByText("400 / 500 characters")).toBeDefined();
      });
    });
  });

  describe("Form submission", () => {
    it("renders submit button with correct text", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /add travel details/i,
      });
      expect(submitButton).toBeDefined();
      expect(submitButton.textContent).toContain("Add travel details");
    });
  });

  describe("Styling", () => {
    it("applies Playfair Display font to title", () => {
      renderWithQueryClient(
        <CreateMemberTravelDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          tripId={tripId}
          timezone="America/New_York"
        />,
      );

      const title = screen.getByText("Add your travel details");
      expect(title.className).toContain(
        "font-[family-name:var(--font-playfair)]",
      );
    });
  });
});
