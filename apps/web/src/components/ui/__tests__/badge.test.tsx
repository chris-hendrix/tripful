import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "../badge";

describe("badgeVariants", () => {
  it("includes font-accent in base classes", () => {
    const classes = badgeVariants({ variant: "default" });
    expect(classes).toContain("font-accent");
  });

  it("includes font-accent for all variants", () => {
    const variants = [
      "default",
      "secondary",
      "destructive",
      "outline",
      "ghost",
      "link",
    ] as const;
    for (const variant of variants) {
      const classes = badgeVariants({ variant });
      expect(classes).toContain("font-accent");
    }
  });
});

describe("Badge", () => {
  it("renders with font-accent class", () => {
    render(<Badge>Test Badge</Badge>);
    const badge = screen.getByText("Test Badge");
    expect(badge.className).toContain("font-accent");
  });

  it("renders with the correct variant classes", () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge.className).toContain("bg-destructive");
  });

  it("sets data-slot attribute to badge", () => {
    render(<Badge>Test</Badge>);
    const badge = screen.getByText("Test");
    expect(badge.getAttribute("data-slot")).toBe("badge");
  });

  it("allows custom className to be applied", () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("custom-class");
  });
});
