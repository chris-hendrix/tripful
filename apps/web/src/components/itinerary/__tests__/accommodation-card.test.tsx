import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccommodationCard } from "../accommodation-card";
import type { Accommodation } from "@tripful/shared/types";

describe("AccommodationCard", () => {
  const baseAccommodation: Accommodation = {
    id: "acc-123",
    tripId: "trip-123",
    createdBy: "user-123",
    name: "Beach Hotel",
    address: "123 Beach Rd, Miami, FL",
    description: "Oceanfront hotel with pool",
    checkIn: "2026-07-15T14:00:00.000Z",
    checkOut: "2026-07-18T11:00:00.000Z",
    links: ["https://example.com/booking"],
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  describe("Rendering", () => {
    it("renders accommodation name and nights label", () => {
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      expect(screen.getByText("Beach Hotel")).toBeDefined();
      expect(screen.getByText("3 nights")).toBeDefined();
    });

    it("renders address as clickable link when expanded", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Expand the card
      const card = screen.getByRole("button");
      await user.click(card);

      const addressLink = screen.getByText("123 Beach Rd, Miami, FL");
      expect(addressLink).toBeDefined();
      expect(addressLink.closest("a")?.href).toContain(
        "google.com/maps/search",
      );
      expect(addressLink.closest("a")?.target).toBe("_blank");
    });

    it("does not render address when null", async () => {
      const user = userEvent.setup();
      const accommodation = { ...baseAccommodation, address: null };
      render(
        <AccommodationCard
          accommodation={accommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Expand the card
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.queryByText("123 Beach Rd, Miami, FL")).toBeNull();
    });
  });

  describe("Expandable behavior", () => {
    it("shows description when expanded", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Description not visible initially
      expect(screen.queryByText("Oceanfront hotel with pool")).toBeNull();

      // Click to expand
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.getByText("Oceanfront hotel with pool")).toBeDefined();
    });

    it("shows links when expanded", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Click to expand
      const card = screen.getByRole("button");
      await user.click(card);

      const link = screen.getByText("Link 1");
      expect(link).toBeDefined();
      expect(link.closest("a")?.href).toBe("https://example.com/booking");
    });

    it("shows check-in and check-out datetimes when expanded", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Check-in/Check-out labels not visible initially
      expect(screen.queryByText("Check-in")).toBeNull();
      expect(screen.queryByText("Check-out")).toBeNull();

      // Click to expand
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.getByText("Check-in")).toBeDefined();
      expect(screen.getByText("Check-out")).toBeDefined();
    });

    it("shows created-by info when expanded", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
          createdByName="Alice"
        />,
      );

      // Click to expand
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.getByText("Created by Alice")).toBeDefined();
    });

    it("shows 'Created by Unknown' when createdByName is not provided", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Click to expand
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.getByText("Created by Unknown")).toBeDefined();
    });
  });

  describe("Edit button", () => {
    it("shows edit button when canEdit is true and expanded", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={true}
          canDelete={false}
          onEdit={onEdit}
        />,
      );

      // Expand card
      const card = screen.getByRole("button");
      await user.click(card);

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeDefined();
      });
    });

    it("calls onEdit when edit button is clicked", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={true}
          canDelete={false}
          onEdit={onEdit}
        />,
      );

      // Expand card
      const card = screen.getByRole("button");
      await user.click(card);

      const editButton = screen.getByText("Edit");
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalled();
    });

    it("does not show edit button when canEdit is false", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      // Expand card
      const card = screen.getByRole("button");
      await user.click(card);

      expect(screen.queryByText("Edit")).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it('has role="button" and tabIndex={0}', () => {
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      const card = screen.getByRole("button");
      expect(card).toBeDefined();
      expect(card.tabIndex).toBe(0);
    });

    it("has aria-expanded attribute", () => {
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      const card = screen.getByRole("button");
      expect(card.getAttribute("aria-expanded")).toBe("false");
    });

    it("toggles aria-expanded when clicked", async () => {
      const user = userEvent.setup();
      render(
        <AccommodationCard
          accommodation={baseAccommodation}
          timezone="America/New_York"
          canEdit={false}
          canDelete={false}
        />,
      );

      const card = screen.getByRole("button");
      expect(card.getAttribute("aria-expanded")).toBe("false");

      await user.click(card);
      expect(card.getAttribute("aria-expanded")).toBe("true");

      await user.click(card);
      expect(card.getAttribute("aria-expanded")).toBe("false");
    });
  });
});
