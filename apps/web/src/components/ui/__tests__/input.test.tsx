import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "../input";

describe("Input", () => {
  it("renders with responsive height classes h-11 and sm:h-9", () => {
    render(<Input aria-label="test input" />);

    const input = screen.getByRole("textbox", { name: "test input" });
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("sm:h-9");
  });

  it("does not contain the old fixed h-9 without responsive prefix", () => {
    render(<Input aria-label="test input" />);

    const input = screen.getByRole("textbox", { name: "test input" });
    // The class string should have "h-11" and "sm:h-9" but not a standalone "h-9"
    // We check that h-9 only appears with the sm: prefix
    const classes = input.className.split(" ");
    const h9Classes = classes.filter((c) => c === "h-9");
    expect(h9Classes.length).toBe(0);
  });

  it("allows custom className to override height", () => {
    render(<Input aria-label="test input" className="h-16" />);

    const input = screen.getByRole("textbox", { name: "test input" });
    expect(input.className).toContain("h-16");
  });

  it("sets data-slot attribute to input", () => {
    render(<Input aria-label="test input" />);

    const input = screen.getByRole("textbox", { name: "test input" });
    expect(input.getAttribute("data-slot")).toBe("input");
  });

  it("renders as an input element", () => {
    render(<Input aria-label="test input" />);

    const input = screen.getByRole("textbox", { name: "test input" });
    expect(input.tagName).toBe("INPUT");
  });
});
