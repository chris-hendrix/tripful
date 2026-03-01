import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RsvpBadge } from "../rsvp-badge";

describe("RsvpBadge", () => {
  describe("default variant", () => {
    it("renders Going badge with success styling", () => {
      render(<RsvpBadge status="going" />);
      const badge = screen.getByText("Going");
      expect(badge.className).toContain("text-success");
    });

    it("renders Maybe badge with warning styling", () => {
      render(<RsvpBadge status="maybe" />);
      const badge = screen.getByText("Maybe");
      expect(badge.className).toContain("text-warning");
    });

    it("renders Not Going badge with destructive styling", () => {
      render(<RsvpBadge status="not_going" />);
      const badge = screen.getByText("Not Going");
      expect(badge.className).toContain("text-destructive");
    });

    it("renders No Response badge with muted styling", () => {
      render(<RsvpBadge status="no_response" />);
      const badge = screen.getByText("No Response");
      expect(badge.className).toContain("text-muted-foreground");
    });
  });

  describe("overlay variant", () => {
    it("renders Going badge with overlay styling", () => {
      render(<RsvpBadge status="going" variant="overlay" />);
      const badge = screen.getByText("Going");
      expect(badge.className).toContain("backdrop-blur-md");
      expect(badge.className).toContain("text-overlay-success");
    });

    it("renders Maybe badge with overlay styling", () => {
      render(<RsvpBadge status="maybe" variant="overlay" />);
      const badge = screen.getByText("Maybe");
      expect(badge.className).toContain("backdrop-blur-md");
      expect(badge.className).toContain("text-overlay-warning");
    });

    it("renders Not Going badge with overlay styling", () => {
      render(<RsvpBadge status="not_going" variant="overlay" />);
      const badge = screen.getByText("Not Going");
      expect(badge.className).toContain("backdrop-blur-md");
      expect(badge.className).toContain("text-overlay-muted");
    });

    it("returns null for no_response status", () => {
      const { container } = render(
        <RsvpBadge status="no_response" variant="overlay" />,
      );
      expect(container.innerHTML).toBe("");
    });
  });
});
