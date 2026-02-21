import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Checkbox } from "../checkbox";

describe("Checkbox", () => {
  it("renders with data-slot='checkbox'", () => {
    render(<Checkbox aria-label="test checkbox" />);

    const checkbox = screen.getByRole("checkbox", { name: "test checkbox" });
    expect(checkbox.getAttribute("data-slot")).toBe("checkbox");
  });

  it("has touch target expansion classes for WCAG 2.5.8 compliance", () => {
    render(<Checkbox aria-label="test checkbox" />);

    const checkbox = screen.getByRole("checkbox", { name: "test checkbox" });
    expect(checkbox.className).toContain("relative");
    expect(checkbox.className).toContain("after:absolute");
    expect(checkbox.className).toContain("after:content-['']");
    expect(checkbox.className).toContain("after:-inset-[14px]");
  });

  it("preserves visual size of size-4", () => {
    render(<Checkbox aria-label="test checkbox" />);

    const checkbox = screen.getByRole("checkbox", { name: "test checkbox" });
    expect(checkbox.className).toContain("size-4");
  });
});
