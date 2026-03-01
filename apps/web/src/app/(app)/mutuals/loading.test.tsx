import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MutualsLoading from "./loading";

describe("MutualsLoading", () => {
  it("renders skeleton placeholders", () => {
    render(<MutualsLoading />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders 6 skeleton cards in the grid", () => {
    const { container } = render(<MutualsLoading />);

    // The grid contains 6 card skeletons, each with a rounded-full avatar skeleton
    const avatarSkeletons = container.querySelectorAll(
      ".rounded-full[data-slot='skeleton']",
    );
    expect(avatarSkeletons).toHaveLength(6);
  });

  it("matches the mutuals page layout structure", () => {
    const { container } = render(<MutualsLoading />);

    // Outer container matches the mutuals page
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("min-h-screen");
    expect(outer.className).toContain("bg-background");

    // Inner container matches max-w-7xl wrapper
    const inner = outer.firstElementChild as HTMLElement;
    expect(inner.className).toContain("max-w-7xl");
  });
});
