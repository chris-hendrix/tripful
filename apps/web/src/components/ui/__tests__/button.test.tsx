import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "../button";

describe("buttonVariants", () => {
  describe("size variants have mobile-first responsive classes", () => {
    it("default size has h-11 mobile and sm:h-9 desktop", () => {
      const classes = buttonVariants({ size: "default" });
      expect(classes).toContain("h-11");
      expect(classes).toContain("sm:h-9");
    });

    it("xs size has h-9 mobile and sm:h-6 desktop", () => {
      const classes = buttonVariants({ size: "xs" });
      expect(classes).toContain("h-9");
      expect(classes).toContain("sm:h-6");
      expect(classes).toContain("px-3");
      expect(classes).toContain("sm:px-2");
    });

    it("sm size has h-11 mobile and sm:h-8 desktop", () => {
      const classes = buttonVariants({ size: "sm" });
      expect(classes).toContain("h-11");
      expect(classes).toContain("sm:h-8");
    });

    it("lg size has h-12 mobile and sm:h-10 desktop", () => {
      const classes = buttonVariants({ size: "lg" });
      expect(classes).toContain("h-12");
      expect(classes).toContain("sm:h-10");
    });

    it("icon size has size-11 mobile and sm:size-9 desktop", () => {
      const classes = buttonVariants({ size: "icon" });
      expect(classes).toContain("size-11");
      expect(classes).toContain("sm:size-9");
    });

    it("icon-xs size has size-9 mobile and sm:size-6 desktop", () => {
      const classes = buttonVariants({ size: "icon-xs" });
      expect(classes).toContain("size-9");
      expect(classes).toContain("sm:size-6");
    });

    it("icon-sm size has size-11 mobile and sm:size-8 desktop", () => {
      const classes = buttonVariants({ size: "icon-sm" });
      expect(classes).toContain("size-11");
      expect(classes).toContain("sm:size-8");
    });

    it("icon-lg size has size-12 mobile and sm:size-10 desktop", () => {
      const classes = buttonVariants({ size: "icon-lg" });
      expect(classes).toContain("size-12");
      expect(classes).toContain("sm:size-10");
    });
  });
});

describe("Button", () => {
  it("renders with default responsive size classes", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.className).toContain("h-11");
    expect(button.className).toContain("sm:h-9");
  });

  it("renders with the correct variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-destructive");
  });

  it("allows custom className to be applied via cn/tailwind-merge", () => {
    render(<Button className="h-20">Tall button</Button>);

    const button = screen.getByRole("button", { name: "Tall button" });
    expect(button.className).toContain("h-20");
  });

  it("renders as a button element by default", () => {
    render(<Button>Test</Button>);

    const button = screen.getByRole("button", { name: "Test" });
    expect(button.tagName).toBe("BUTTON");
  });

  it("sets data-slot attribute to button", () => {
    render(<Button>Test</Button>);

    const button = screen.getByRole("button", { name: "Test" });
    expect(button.getAttribute("data-slot")).toBe("button");
  });
});
