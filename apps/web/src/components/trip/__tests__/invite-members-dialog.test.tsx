import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InviteMembersDialog } from "../invite-members-dialog";

// Mock sonner
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock PhoneInput
vi.mock("@/components/ui/phone-input", () => ({
  PhoneInput: ({
    value,
    onChange,
    disabled,
    placeholder,
  }: {
    value?: string;
    onChange?: (value?: string) => void;
    disabled?: boolean;
    placeholder?: string;
  }) => (
    <input
      type="tel"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label="Phone number"
      data-testid="phone-input"
    />
  ),
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

// Mock format
vi.mock("@/lib/format", () => ({
  formatPhoneNumber: (phone: string) => phone,
}));

let queryClient: QueryClient;

beforeEach(async () => {
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
  vi.clearAllMocks();

  // Suppress console.log and console.error to avoid test output noise
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  tripId: "trip-123",
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("InviteMembersDialog", () => {
  describe("Dialog open/close behavior", () => {
    it("renders when open is true", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      expect(screen.getByText("Invite members")).toBeDefined();
    });

    it("does not render when open is false", () => {
      renderWithQueryClient(
        <InviteMembersDialog {...defaultProps} open={false} />,
      );

      expect(screen.queryByText("Invite members")).toBeNull();
    });

    it("cancel button calls onOpenChange(false)", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Form fields rendering", () => {
    it("renders phone input", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      expect(screen.getByTestId("phone-input")).toBeDefined();
    });

    it("renders Add button", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: /add/i })).toBeDefined();
    });

    it("renders submit button disabled when no phones added", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      expect(submitButton).toHaveProperty("disabled", true);
    });
  });

  describe("Phone number management", () => {
    it("adds valid phone and shows it as a chip", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      await user.type(phoneInput, "+14155552671");

      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });
    });

    it("shows error for invalid phone number", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      await user.type(phoneInput, "invalid");

      const addButton = screen.getByRole("button", { name: /add/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByText(/phone number must be in E\.164 format/i),
        ).toBeDefined();
      });
    });

    it("shows error for duplicate phone number", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      // Add first phone
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Try to add same phone again
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByText(/this phone number is already added/i),
        ).toBeDefined();
      });
    });

    it("removes phone chip when X button is clicked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      // Add phone
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Remove phone
      const removeButton = screen.getByRole("button", {
        name: /remove \+14155552671/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("+14155552671")).toBeNull();
      });
    });

    it("shows count of added phones", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("1 phone number added")).toBeDefined();
      });

      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("2 phone numbers added")).toBeDefined();
      });
    });
  });

  describe("Form submission", () => {
    it("submits with correct phoneNumbers array via apiRequest", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: [
          { id: "inv-1", inviteePhone: "+14155552671" },
          { id: "inv-2", inviteePhone: "+14155552672" },
        ],
        skipped: [],
      });

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      // Add phones
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);
      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("2 phone numbers added")).toBeDefined();
      });

      // Submit
      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/trips/trip-123/invitations",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("+14155552671"),
          }),
        );
      });
    });

    it("shows success toast with correct message on success", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: [
          { id: "inv-1", inviteePhone: "+14155552671" },
          { id: "inv-2", inviteePhone: "+14155552672" },
        ],
        skipped: [],
      });

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);
      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("2 phone numbers added")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("2 invitations sent");
      });
    });

    it("shows success toast with skipped count when applicable", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockResolvedValueOnce({
        success: true,
        invitations: [{ id: "inv-1", inviteePhone: "+14155552671" }],
        skipped: ["+14155552672"],
      });

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);
      await user.type(phoneInput, "+14155552672");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("2 phone numbers added")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "1 invitation sent (1 already invited)",
        );
      });
    });
  });

  describe("Error handling", () => {
    it("shows error toast on API error", async () => {
      const { apiRequest, APIError } = await import("@/lib/api");
      vi.mocked(apiRequest).mockRejectedValueOnce(
        new APIError("UNKNOWN_ERROR", "Something went wrong"),
      );

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it("shows permission denied error message", async () => {
      const { apiRequest, APIError } = await import("@/lib/api");
      vi.mocked(apiRequest).mockRejectedValueOnce(
        new APIError("PERMISSION_DENIED", "Permission denied"),
      );

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "You don't have permission to invite members to this trip.",
        );
      });
    });
  });

  describe("Loading state", () => {
    it("disables inputs during submission", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  invitations: [
                    { id: "inv-1", inviteePhone: "+14155552671" },
                  ],
                  skipped: [],
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      // Check that inputs are disabled
      const phoneInputAfterSubmit = screen.getByTestId("phone-input");
      expect(phoneInputAfterSubmit).toHaveProperty("disabled", true);

      const addButtonAfterSubmit = screen.getByRole("button", {
        name: /add/i,
      });
      expect(addButtonAfterSubmit).toHaveProperty("disabled", true);
    });

    it("shows loading spinner on submit button", async () => {
      const { apiRequest } = await import("@/lib/api");
      vi.mocked(apiRequest).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  invitations: [
                    { id: "inv-1", inviteePhone: "+14155552671" },
                  ],
                  skipped: [],
                }),
              100,
            );
          }),
      );

      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      await user.click(submitButton);

      expect(screen.getByText("Sending invitations...")).toBeDefined();
    });
  });

  describe("Styling", () => {
    it("dialog title uses Playfair font", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const title = screen.getByText("Invite members");
      expect(title.className).toContain(
        "font-[family-name:var(--font-playfair)]",
      );
    });

    it("submit button uses gradient variant", () => {
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /send invitations/i,
      });
      expect(submitButton.className).toContain("bg-gradient-to-r");
      expect(submitButton.className).toContain("from-primary");
      expect(submitButton.className).toContain("to-accent");
    });

    it("phone chips use Badge component with secondary variant", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<InviteMembersDialog {...defaultProps} />);

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        const badge = screen.getByText("+14155552671").closest("[data-slot='badge']");
        expect(badge).not.toBeNull();
        expect(badge!.getAttribute("data-variant")).toBe("secondary");
      });
    });
  });

  describe("Form reset", () => {
    it("resets form when dialog closes", async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithQueryClient(
        <InviteMembersDialog {...defaultProps} />,
      );

      const phoneInput = screen.getByTestId("phone-input");
      const addButton = screen.getByRole("button", { name: /add/i });

      // Add a phone number
      await user.type(phoneInput, "+14155552671");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("+14155552671")).toBeDefined();
      });

      // Close dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <InviteMembersDialog {...defaultProps} open={false} />
        </QueryClientProvider>,
      );

      // Reopen dialog
      rerender(
        <QueryClientProvider client={queryClient}>
          <InviteMembersDialog {...defaultProps} open={true} />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.queryByText("+14155552671")).toBeNull();
      });
    });
  });
});
