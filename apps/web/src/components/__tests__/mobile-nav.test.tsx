import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "../mobile-nav";

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

const mockUser = {
  id: "user-1",
  phoneNumber: "+15551234567",
  displayName: "John Doe",
  profilePhotoUrl: undefined,
  timezone: "America/New_York",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("MobileNav", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnLogout = vi.fn();
  const mockOnProfileOpen = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    user: mockUser,
    onLogout: mockOnLogout,
    onProfileOpen: mockOnProfileOpen,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation links (My Trips and My Mutuals)", () => {
    render(<MobileNav {...defaultProps} />);

    const tripsLink = screen.getByTestId("mobile-menu-trips-link");
    expect(tripsLink).toBeDefined();
    expect(tripsLink.textContent).toContain("My Trips");
    expect(tripsLink.getAttribute("href")).toBe("/trips");

    const mutualsLink = screen.getByTestId("mobile-menu-mutuals-link");
    expect(mutualsLink).toBeDefined();
    expect(mutualsLink.textContent).toContain("My Mutuals");
    expect(mutualsLink.getAttribute("href")).toBe("/mutuals");
  });

  it("shows user info (name and phone number)", () => {
    render(<MobileNav {...defaultProps} />);

    const userInfo = screen.getByTestId("mobile-menu-user-info");
    expect(userInfo).toBeDefined();
    expect(userInfo.textContent).toContain("John Doe");
    expect(userInfo.textContent).toContain("+15551234567");
  });

  it("does not show user info when user is null", () => {
    render(<MobileNav {...defaultProps} user={null} />);

    expect(screen.queryByTestId("mobile-menu-user-info")).toBeNull();
  });

  it("calls onLogout when Log out is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const logoutButton = screen.getByTestId("mobile-menu-logout-button");
    await user.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange(false) when Log out is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const logoutButton = screen.getByTestId("mobile-menu-logout-button");
    await user.click(logoutButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onProfileOpen when Profile is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const profileButton = screen.getByTestId("mobile-menu-profile-button");
    await user.click(profileButton);

    expect(mockOnProfileOpen).toHaveBeenCalledOnce();
  });

  it("calls onOpenChange(false) when Profile is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const profileButton = screen.getByTestId("mobile-menu-profile-button");
    await user.click(profileButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when a navigation link is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const tripsLink = screen.getByTestId("mobile-menu-trips-link");
    await user.click(tripsLink);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when My Mutuals link is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav {...defaultProps} />);

    const mutualsLink = screen.getByTestId("mobile-menu-mutuals-link");
    await user.click(mutualsLink);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render sheet content when open is false", () => {
    render(<MobileNav {...defaultProps} open={false} />);

    expect(screen.queryByTestId("mobile-menu-trips-link")).toBeNull();
    expect(screen.queryByTestId("mobile-menu-mutuals-link")).toBeNull();
  });

  it("shows user initials in avatar fallback", () => {
    render(<MobileNav {...defaultProps} />);

    expect(screen.getByText("JD")).toBeDefined();
  });
});
