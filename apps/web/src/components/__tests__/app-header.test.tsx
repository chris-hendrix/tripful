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

// Mock notification hooks
vi.mock("@/hooks/use-notifications", () => ({
  useUnreadCount: () => ({ data: 0, isLoading: false }),
  useNotifications: () => ({ data: undefined, isLoading: false }),
  useMarkAsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAllAsRead: () => ({ mutate: vi.fn(), isPending: false }),
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

let mockPathname = "/trips";

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
    mockPathname = "/trips";
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

  it("renders the wordmark as a link to /trips", () => {
    render(<AppHeader />);

    const wordmark = screen.getByText("Tripful");
    expect(wordmark.closest("a")?.getAttribute("href")).toBe("/trips");
  });

  it("renders the wordmark in Playfair Display font", () => {
    render(<AppHeader />);

    const wordmark = screen.getByText("Tripful");
    expect(wordmark.className).toContain(
      "font-[family-name:var(--font-playfair)]",
    );
  });

  it("renders a My Trips nav link", () => {
    render(<AppHeader />);

    const myTripsLink = screen.getByText("My Trips");
    expect(myTripsLink).toBeDefined();
    expect(myTripsLink.getAttribute("href")).toBe("/trips");
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
      expect(screen.getByText("John Doe")).toBeDefined();
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

  it("applies active styling to My Trips link when on /trips", () => {
    mockPathname = "/trips";
    render(<AppHeader />);

    const myTripsLink = screen.getByText("My Trips");
    expect(myTripsLink.className).toContain("text-foreground");
    expect(myTripsLink.className).not.toContain("text-foreground/60");
  });

  it("applies active styling to My Trips link on nested trips routes", () => {
    mockPathname = "/trips/settings";
    render(<AppHeader />);

    const myTripsLink = screen.getByText("My Trips");
    expect(myTripsLink.className).toContain("text-foreground");
    expect(myTripsLink.className).not.toContain("text-foreground/60");
  });

  it("applies inactive styling to My Trips link when on a different page", () => {
    mockPathname = "/settings";
    render(<AppHeader />);

    const myTripsLink = screen.getByText("My Trips");
    expect(myTripsLink.className).toContain("text-foreground/60");
  });
});
