import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipLink } from "../skip-link";

describe("SkipLink", () => {
  it("renders a skip link", () => {
    render(<SkipLink />);

    const link = screen.getByText("Skip to main content");
    expect(link).toBeDefined();
  });

  it("has correct href pointing to #main-content", () => {
    render(<SkipLink />);

    const link = screen.getByText("Skip to main content");
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("is an anchor element", () => {
    render(<SkipLink />);

    const link = screen.getByText("Skip to main content");
    expect(link.tagName).toBe("A");
  });

  it("has sr-only class by default for screen reader accessibility", () => {
    render(<SkipLink />);

    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("sr-only");
  });

  it("has focus styles to become visible on focus", () => {
    render(<SkipLink />);

    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("focus:not-sr-only");
    expect(link.className).toContain("focus:absolute");
  });
});
