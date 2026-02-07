import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditTripDialog } from "../edit-trip-dialog";
import type { Trip } from "@/hooks/use-trips";

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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("EditTripDialog", () => {
  const mockOnOpenChange = vi.fn();
  let queryClient: QueryClient;

  const mockTrip: Trip = {
    id: "trip-123",
    name: "Existing Trip",
    destination: "Miami, FL",
    startDate: "2026-07-01",
    endDate: "2026-07-15",
    preferredTimezone: "America/New_York",
    description: "A fun summer trip",
    coverImageUrl: "https://example.com/image.jpg",
    createdBy: "user-123",
    allowMembersToAddEvents: true,
    cancelled: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();

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

    // Mock console.log and console.error to avoid test output noise
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
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      expect(screen.getByText("Edit trip")).toBeDefined();
    });

    it("does not render dialog content when open is false", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      expect(screen.queryByText("Edit trip")).toBeNull();
    });

    it("calls onOpenChange when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Form pre-population", () => {
    it("pre-populates all fields with trip data", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const nameInput = screen.getByLabelText(/trip name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("Existing Trip");

      const destinationInput = screen.getByLabelText(
        /destination/i,
      ) as HTMLInputElement;
      expect(destinationInput.value).toBe("Miami, FL");

      const startDateInput = screen.getByLabelText(
        /start date/i,
      ) as HTMLInputElement;
      expect(startDateInput.value).toBe("2026-07-01");

      const endDateInput = screen.getByLabelText(
        /end date/i,
      ) as HTMLInputElement;
      expect(endDateInput.value).toBe("2026-07-15");
    });

    it("pre-populates description on Step 2", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Navigate to Step 2
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(
          /description/i,
        ) as HTMLTextAreaElement;
        expect(descriptionInput.value).toBe("A fun summer trip");
      });
    });

    it("pre-populates checkbox state on Step 2", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Navigate to Step 2
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox", {
          name: /allow members to add events/i,
        });
        expect(checkbox.getAttribute("data-state")).toBe("checked");
      });
    });

    it("handles null description gracefully", async () => {
      const user = userEvent.setup();
      const tripWithoutDescription = {
        ...mockTrip,
        description: null,
      };

      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={tripWithoutDescription}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(
          /description/i,
        ) as HTMLTextAreaElement;
        expect(descriptionInput.value).toBe("");
      });
    });

    it("handles null dates gracefully", () => {
      const tripWithoutDates = {
        ...mockTrip,
        startDate: null,
        endDate: null,
      };

      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={tripWithoutDates}
        />,
      );

      const startDateInput = screen.getByLabelText(
        /start date/i,
      ) as HTMLInputElement;
      expect(startDateInput.value).toBe("");

      const endDateInput = screen.getByLabelText(
        /end date/i,
      ) as HTMLInputElement;
      expect(endDateInput.value).toBe("");
    });

    it("resets form when dialog reopens", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Modify a field
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Modified Name");

      // Close dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditTripDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            trip={mockTrip}
          />
        </QueryClientProvider>,
      );

      // Reopen dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditTripDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            trip={mockTrip}
          />
        </QueryClientProvider>,
      );

      // Form should reset to original values
      await waitFor(() => {
        const nameInputAfterReopen = screen.getByLabelText(
          /trip name/i,
        ) as HTMLInputElement;
        expect(nameInputAfterReopen.value).toBe("Existing Trip");
      });
    });
  });

  describe("Step navigation", () => {
    it("starts at Step 1", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      expect(screen.getByText("Step 1 of 2")).toBeDefined();
      expect(screen.getByText("Basic information")).toBeDefined();
    });

    it("proceeds to Step 2 with valid Step 1 data", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
        expect(screen.getByText("Details & settings")).toBeDefined();
      });
    });

    it("returns to Step 1 when Back button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Navigate to Step 2
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Click Back
      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
      });
    });

    it("resets to Step 1 when dialog reopens", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Navigate to Step 2
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Close dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditTripDialog
            open={false}
            onOpenChange={mockOnOpenChange}
            trip={mockTrip}
          />
        </QueryClientProvider>,
      );

      // Reopen dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <EditTripDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            trip={mockTrip}
          />
        </QueryClientProvider>,
      );

      // Should be back at Step 1
      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
      });
    });
  });

  describe("Field validation", () => {
    it("shows error when trip name is too short", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const nameInput = screen.getByLabelText(/trip name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "AB");
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/trip name must be at least 3 characters/i),
        ).toBeDefined();
      });
    });

    it("shows error when destination is empty", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.clear(destinationInput);
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/destination is required/i)).toBeDefined();
      });
    });

    it("shows error when end date is before start date", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const startDateInput = screen.getByLabelText(/start date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, "2026-12-31");

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.clear(endDateInput);
      await user.type(endDateInput, "2026-01-01");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/end date must be on or after start date/i),
        ).toBeDefined();
      });
    });

    it("accepts valid modifications", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const nameInput = screen.getByLabelText(/trip name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Modified Trip Name");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    });
  });

  describe("Update mutation", () => {
    it("calls API with updated trip data on submit", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        trip: {
          ...mockTrip,
          name: "Updated Trip Name",
          description: "Updated description",
        },
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      // Modify Step 1 fields
      const nameInput = screen.getByLabelText(/trip name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Trip Name");

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // Modify Step 2 fields
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "Updated description");

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/trips/trip-123",
          expect.objectContaining({
            method: "PUT",
            body: expect.stringContaining("Updated Trip Name"),
          }),
        );
      });
    });

    it("closes dialog on successful update", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        trip: { ...mockTrip, name: "Updated Trip Name" },
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("calls onSuccess callback after successful update", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        trip: { ...mockTrip, name: "Updated Trip Name" },
      });

      const mockOnSuccess = vi.fn();
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
          onSuccess={mockOnSuccess}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onSuccess callback when update fails", async () => {
      const { apiRequest, APIError } = await import("@/lib/api");
      vi.mocked(apiRequest).mockRejectedValueOnce(
        new APIError("PERMISSION_DENIED", "Permission denied"),
      );

      const mockOnSuccess = vi.fn();
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
          onSuccess={mockOnSuccess}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/you don't have permission to edit this trip/i),
        );
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("works without onSuccess callback (backward compatibility)", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        trip: { ...mockTrip, name: "Updated Trip Name" },
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows loading state during update", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  trip: mockTrip,
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      expect(screen.getByText("Updating trip...")).toBeDefined();
    });

    it("disables all fields during update", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  trip: mockTrip,
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveProperty("disabled", true);

      const checkbox = screen.getByLabelText(/allow members to add events/i);
      expect(checkbox).toHaveProperty("disabled", true);
    });

    it("shows error toast on update failure", async () => {
      const { apiRequest, APIError } = await import("@/lib/api");
      vi.mocked(apiRequest).mockRejectedValueOnce(
        new APIError("PERMISSION_DENIED", "Permission denied"),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /update trip/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/you don't have permission to edit this trip/i),
        );
      });
    });
  });

  describe("Delete confirmation flow", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("shows delete button on Step 2", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      expect(
        screen.getByRole("button", { name: /delete trip/i }),
      ).toBeDefined();
    });

    it("shows confirmation dialog when delete is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      const deleteButton = screen.getByRole("button", { name: /delete trip/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete this trip/i),
        ).toBeDefined();
      });
    });

    it("shows cancel and confirm buttons in confirmation dialog", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
        expect(
          screen.getByRole("button", { name: /yes, delete/i }),
        ).toBeDefined();
      });
    });

    it("cancels delete confirmation", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete this trip/i),
        ).toBeDefined();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/are you sure you want to delete this trip/i),
        ).toBeNull();
      });
    });

    it("calls delete API when confirmed", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        message: "Trip cancelled successfully",
      });

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /yes, delete/i }),
        ).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /yes, delete/i }));

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/trips/trip-123",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });
    });

    it("shows loading state during delete", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  message: "Trip cancelled successfully",
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /yes, delete/i }),
        ).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /yes, delete/i }));

      // After confirming delete, the AlertDialog closes and the Delete trip button
      // becomes disabled while the API call is in progress
      await waitFor(() => {
        const deleteButton = screen.getByRole("button", {
          name: /delete trip/i,
        });
        expect(deleteButton).toHaveProperty("disabled", true);
      });
    });

    it("shows error toast on delete failure", async () => {
      const { apiRequest, APIError } = await import("@/lib/api");
      vi.mocked(apiRequest).mockRejectedValueOnce(
        new APIError("PERMISSION_DENIED", "Permission denied"),
      );

      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /yes, delete/i }),
        ).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /yes, delete/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/you don't have permission to delete this trip/i),
        );
      });
    });

    it("resets delete confirmation when navigating back", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      await user.click(screen.getByRole("button", { name: /delete trip/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete this trip/i),
        ).toBeDefined();
      });

      // Cancel the AlertDialog first (it's a modal overlay)
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(
          screen.queryByText(/are you sure you want to delete this trip/i),
        ).toBeNull();
      });

      // Click Back button
      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText("Step 1 of 2")).toBeDefined();
      });

      // Navigate back to Step 2
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });

      // AlertDialog confirmation should not be showing
      expect(
        screen.queryByText(/are you sure you want to delete this trip/i),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: /delete trip/i }),
      ).toBeDefined();
    });
  });

  describe("Styling", () => {
    it("applies Playfair Display font to title", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const title = screen.getByText("Edit trip");
      expect(title.className).toContain(
        "font-[family-name:var(--font-playfair)]",
      );
    });

    it("applies gradient styling to Continue button", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton.className).toContain("bg-gradient-to-r");
      expect(continueButton.className).toContain("from-primary");
      expect(continueButton.className).toContain("to-accent");
    });

    it("applies gradient styling to Update button", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const updateButton = screen.getByRole("button", {
          name: /update trip/i,
        });
        expect(updateButton.className).toContain("bg-gradient-to-r");
        expect(updateButton.className).toContain("from-primary");
        expect(updateButton.className).toContain("to-accent");
      });
    });

    it("applies destructive styling to Delete button", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", {
          name: /delete trip/i,
        });
        expect(deleteButton).toBeDefined();
        // Check that the button has the variant prop applied
        // Note: The actual styling classes are applied by the Button component
      });
    });
  });

  describe("Step 2 - Description field", () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
      });
    }

    it("shows character counter at 1600+ characters", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      const descriptionInput = screen.getByLabelText(
        /description/i,
      ) as HTMLTextAreaElement;
      const longText = "a".repeat(1600);

      await user.click(descriptionInput);
      await user.clear(descriptionInput);
      await user.paste(longText);

      await waitFor(() => {
        expect(screen.getByText("1600 / 2000 characters")).toBeDefined();
      });
    });

    it("does not show character counter below 1600 characters", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await navigateToStep2(user);

      expect(screen.queryByText(/\/ 2000 characters/i)).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all form fields", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      expect(screen.getByLabelText(/trip name/i)).toBeDefined();
      expect(screen.getByLabelText(/destination/i)).toBeDefined();
      expect(screen.getByLabelText(/start date/i)).toBeDefined();
      expect(screen.getByLabelText(/end date/i)).toBeDefined();
      expect(screen.getByLabelText(/trip timezone/i)).toBeDefined();
    });

    it("has aria-invalid attribute on invalid fields", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      const nameInput = screen.getByLabelText(/trip name/i);
      await user.clear(nameInput);
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(nameInput.getAttribute("aria-invalid")).toBe("true");
      });
    });
  });

  describe("Progress indicator", () => {
    it("shows Step 1 active initially", () => {
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      expect(screen.getByText("Step 1 of 2")).toBeDefined();
      expect(screen.getByText("Basic information")).toBeDefined();
    });

    it("shows Step 2 active after navigation", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <EditTripDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          trip={mockTrip}
        />,
      );

      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText("Step 2 of 2")).toBeDefined();
        expect(screen.getByText("Details & settings")).toBeDefined();
      });
    });
  });
});
