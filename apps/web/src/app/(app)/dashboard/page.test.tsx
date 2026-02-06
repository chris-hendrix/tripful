import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@tripful/shared";
import DashboardPage from "./page";

// Mock auth provider
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("@/app/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("DashboardPage", () => {
  const mockUser: User = {
    id: "123",
    phoneNumber: "+15551234567",
    displayName: "Test User",
    timezone: "America/New_York",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    mockLogout.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders user information", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    render(<DashboardPage />);

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Test User")).toBeDefined();
    expect(screen.getByText("+15551234567")).toBeDefined();
    expect(screen.getByText("America/New_York")).toBeDefined();
  });

  it("renders profile photo when present", () => {
    const userWithPhoto: User = {
      ...mockUser,
      profilePhotoUrl: "https://example.com/photo.jpg",
    };

    mockUseAuth.mockReturnValue({
      user: userWithPhoto,
      logout: mockLogout,
    });

    render(<DashboardPage />);

    const img = screen.getByAltText("Profile");
    expect(img).toBeDefined();
    expect(img).toHaveProperty("src", "https://example.com/photo.jpg");
  });

  it("does not render profile photo when not present", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    render(<DashboardPage />);

    const img = screen.queryByAltText("Profile");
    expect(img).toBeNull();
  });

  it("calls logout when logout button is clicked", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });

    render(<DashboardPage />);

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("returns null when user is not present", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: mockLogout,
    });

    const { container } = render(<DashboardPage />);

    expect(container.innerHTML).toBe("");
  });
});
