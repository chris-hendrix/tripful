import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock useAuth
const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock("@/app/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AppHeader } from "../app-header";

let mockPathname = "/dashboard";

const mockUser = {
  id: "user-1",
  phoneNumber: "+15551234567",
  displayName: "John Doe",
  profilePhotoUrl: undefined,
  timezone: "America/New_York",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/dashboard";
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      logout: mockLogout,
    });
  });

  it("renders the Tripful wordmark", () => {
    render(<AppHeader />);

    const wordmark = screen.getByText("Tripful");
    expect(wordmark).toBeDefined();
  });

  it("renders the wordmark as a link to /dashboard", () => {
    render(<AppHeader />);

    const wordmark = screen.getByText("Tripful");
    expect(wordmark.closest("a")?.getAttribute("href")).toBe("/dashboard");
  });

  it("renders the wordmark in Playfair Display font", () => {
    render(<AppHeader />);

    const wordmark = screen.getByText("Tripful");
    expect(wordmark.className).toContain(
      "font-[family-name:var(--font-playfair)]",
    );
  });

  it("renders a Dashboard nav link", () => {
    render(<AppHeader />);

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink).toBeDefined();
    expect(dashboardLink.getAttribute("href")).toBe("/dashboard");
  });

  it("renders the main navigation landmark", () => {
    render(<AppHeader />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeDefined();
  });

  it("renders a header landmark", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    expect(header).toBeDefined();
  });

  it("renders user avatar button", () => {
    render(<AppHeader />);

    const avatarButton = screen.getByRole("button", { name: "User menu" });
    expect(avatarButton).toBeDefined();
  });

  it("renders user initials in avatar fallback", () => {
    render(<AppHeader />);

    expect(screen.getByText("JD")).toBeDefined();
  });

  it("renders single initial for single-name user", () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, displayName: "Alice" },
      loading: false,
      logout: mockLogout,
    });

    render(<AppHeader />);

    expect(screen.getByText("A")).toBeDefined();
  });

  it("renders ? when user is null", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: mockLogout,
    });

    render(<AppHeader />);

    expect(screen.getByText("?")).toBeDefined();
  });

  it("opens dropdown menu when avatar is clicked", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    const avatarButton = screen.getByRole("button", { name: "User menu" });
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeDefined();
      expect(screen.getByText("Log out")).toBeDefined();
    });
  });

  it("shows user display name and phone in dropdown", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    const avatarButton = screen.getByRole("button", { name: "User menu" });
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeDefined();
      expect(screen.getByText("+15551234567")).toBeDefined();
    });
  });

  it("has a Profile link pointing to /profile", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    const avatarButton = screen.getByRole("button", { name: "User menu" });
    await user.click(avatarButton);

    await waitFor(() => {
      const profileLink = screen.getByText("Profile").closest("a");
      expect(profileLink?.getAttribute("href")).toBe("/profile");
    });
  });

  it("calls logout when Log out is clicked", async () => {
    const user = userEvent.setup();
    render(<AppHeader />);

    const avatarButton = screen.getByRole("button", { name: "User menu" });
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText("Log out")).toBeDefined();
    });

    const logoutItem = screen.getByText("Log out");
    await user.click(logoutItem);

    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("applies active styling to Dashboard link when on /dashboard", () => {
    mockPathname = "/dashboard";
    render(<AppHeader />);

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.className).toContain("text-foreground");
    expect(dashboardLink.className).not.toContain("text-foreground/60");
  });

  it("applies active styling to Dashboard link on nested dashboard routes", () => {
    mockPathname = "/dashboard/settings";
    render(<AppHeader />);

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.className).toContain("text-foreground");
    expect(dashboardLink.className).not.toContain("text-foreground/60");
  });

  it("applies inactive styling to Dashboard link when on a different page", () => {
    mockPathname = "/trips/123";
    render(<AppHeader />);

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink.className).toContain("text-foreground/60");
  });
});
