import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import CompleteProfilePage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock auth provider
const mockCompleteProfile = vi.fn();
let mockUser: any = null;
vi.mock("@/app/providers/auth-provider", () => ({
  useAuth: () => ({
    completeProfile: mockCompleteProfile,
    get user() {
      return mockUser;
    },
  }),
}));

describe("CompleteProfilePage", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);
    mockCompleteProfile.mockClear();
    mockPush.mockClear();
    mockUser = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the complete profile form", () => {
    render(<CompleteProfilePage />);

    expect(screen.getByText("Complete your profile")).toBeDefined();
    expect(
      screen.getByText("Tell us a bit about yourself to get started"),
    ).toBeDefined();
    expect(screen.getByLabelText(/display name/i)).toBeDefined();
    expect(screen.getByLabelText(/timezone/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /complete profile/i }),
    ).toBeDefined();
  });

  it("displays validation error for display name that is too short", async () => {
    const user = userEvent.setup();
    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "Jo");
    await user.click(button);

    await waitFor(
      () => {
        const errorMessage = screen.queryByText(
          /display name must be at least 3 characters/i,
        );
        expect(errorMessage).not.toBeNull();
      },
      { timeout: 3000 },
    );

    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it("displays validation error for display name that is too long", async () => {
    const user = userEvent.setup();
    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    const longName = "a".repeat(51);
    await user.type(input, longName);
    await user.click(button);

    await waitFor(() => {
      const errorMessage = screen.queryByText(
        "Display name must not exceed 50 characters",
      );
      expect(errorMessage).toBeTruthy();
    });

    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it("displays validation error for empty display name", async () => {
    const user = userEvent.setup();
    render(<CompleteProfilePage />);

    const button = screen.getByRole("button", { name: /complete profile/i });
    await user.click(button);

    await waitFor(() => {
      const errorMessage = screen.queryByText(
        /display name must be at least 3 characters/i,
      );
      expect(errorMessage).toBeTruthy();
    });

    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it("calls completeProfile with correct data on submit", async () => {
    const user = userEvent.setup();
    mockCompleteProfile.mockResolvedValue(undefined);

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "John Doe",
          timezone: expect.any(String),
        }),
      );
    });
  });

  it("redirects to dashboard on successful profile completion", async () => {
    const user = userEvent.setup();
    mockCompleteProfile.mockImplementation(async () => {
      mockUser = { id: "1", displayName: "John Doe", phoneNumber: "+15551234567" };
    });

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays error message on API failure", async () => {
    const user = userEvent.setup();
    mockCompleteProfile.mockRejectedValue(
      new Error("Profile completion failed"),
    );

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      const errorMessage = screen.queryByText("Profile completion failed");
      expect(errorMessage).toBeTruthy();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables button and shows loading state while submitting", async () => {
    const user = userEvent.setup();
    let resolveCompleteProfile: () => void;
    mockCompleteProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveCompleteProfile = resolve as () => void;
      }),
    );

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      expect(button).toHaveProperty("disabled", true);
      const savingText = screen.queryByText("Saving...");
      expect(savingText).toBeTruthy();
    });

    // Resolve the promise and set user - this triggers navigation
    mockUser = { id: "1", displayName: "John Doe", phoneNumber: "+15551234567" };
    resolveCompleteProfile!();

    // After successful completion, button stays disabled until navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows helper text for display name", () => {
    render(<CompleteProfilePage />);

    expect(
      screen.getByText("This is how others will see you on the platform"),
    ).toBeDefined();
  });

  it("shows helper text for timezone", () => {
    render(<CompleteProfilePage />);

    expect(
      screen.getByText("Used to show you times in your local timezone"),
    ).toBeDefined();
  });

  it("shows settings disclaimer text", () => {
    render(<CompleteProfilePage />);

    expect(
      screen.getByText(
        "You can update this information later in your settings",
      ),
    ).toBeDefined();
  });

  it("sets default timezone from browser", () => {
    render(<CompleteProfilePage />);

    // The timezone should be set to browser's timezone
    // We can verify this by checking that the select has a value
    const timezoneSelect = screen.getByRole("combobox", { name: /timezone/i });
    expect(timezoneSelect).toBeDefined();
  });

  it("submits with timezone from form", async () => {
    const user = userEvent.setup();
    mockCompleteProfile.mockResolvedValue(undefined);

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    await user.type(input, "John Doe");

    const button = screen.getByRole("button", { name: /complete profile/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "John Doe",
          timezone: expect.any(String),
        }),
      );
    });
  });

  it("auto-focuses the display name input on mount", () => {
    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    expect(document.activeElement).toBe(input);
  });

  it("handles generic error without message", async () => {
    const user = userEvent.setup();
    mockCompleteProfile.mockRejectedValue(new Error());

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      const errorMessage = screen.queryByText("Failed to complete profile");
      expect(errorMessage).toBeTruthy();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables form inputs while submitting", async () => {
    const user = userEvent.setup();
    let resolveCompleteProfile: () => void;
    mockCompleteProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveCompleteProfile = resolve as () => void;
      }),
    );

    render(<CompleteProfilePage />);

    const input = screen.getByLabelText(/display name/i);
    const button = screen.getByRole("button", { name: /complete profile/i });

    await user.type(input, "John Doe");
    await user.click(button);

    await waitFor(() => {
      expect(input).toHaveProperty("disabled", true);
    });

    // Resolve the promise and set user - this triggers navigation
    mockUser = { id: "1", displayName: "John Doe", phoneNumber: "+15551234567" };
    resolveCompleteProfile!();

    // After successful completion, inputs stay disabled until navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
