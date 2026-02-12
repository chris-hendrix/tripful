import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockGet,
  })),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

import LoginLayout from "./layout";

describe("LoginLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /trips when auth_token cookie exists", async () => {
    mockGet.mockReturnValue({ name: "auth_token", value: "valid-token" });

    await expect(
      LoginLayout({ children: <div>Login form</div> }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/trips");
  });

  it("renders children when auth_token cookie is missing", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await LoginLayout({
      children: <div>Login form</div>,
    });

    render(result as React.ReactElement);
    expect(screen.getByText("Login form")).toBeDefined();
  });

  it("renders children when auth_token cookie has empty value", async () => {
    mockGet.mockReturnValue({ name: "auth_token", value: "" });

    const result = await LoginLayout({
      children: <div>Login form</div>,
    });

    render(result as React.ReactElement);
    expect(screen.getByText("Login form")).toBeDefined();
  });

  it("checks the correct cookie name", async () => {
    mockGet.mockReturnValue(undefined);

    await LoginLayout({ children: <div>Login form</div> });

    expect(mockGet).toHaveBeenCalledWith("auth_token");
  });
});
