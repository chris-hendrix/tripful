import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { Toaster } from "../sonner";
import { toast } from "sonner";

describe("Toaster", () => {
  it("renders the notification section", () => {
    const { container } = render(<Toaster />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();
    expect(section?.getAttribute("aria-label")).toContain("Notifications");
  });

  it("renders toaster with bottom-right position and z-[60] class when a toast is shown", async () => {
    const { container } = render(<Toaster />);

    act(() => {
      toast("Test notification");
    });

    // Wait for sonner to render the toast list
    await vi.waitFor(() => {
      const toasterEl = container.querySelector("[data-sonner-toaster]");
      expect(toasterEl).toBeTruthy();
    });

    const toasterEl = container.querySelector("[data-sonner-toaster]");
    expect(toasterEl?.getAttribute("data-x-position")).toBe("right");
    expect(toasterEl?.getAttribute("data-y-position")).toBe("bottom");
    expect(toasterEl?.className).toContain("z-[60]");
  });

  it("renders close button on toasts when closeButton is enabled", async () => {
    const { container } = render(<Toaster />);

    act(() => {
      toast("Test with close button");
    });

    await vi.waitFor(() => {
      const toastEl = container.querySelector("[data-sonner-toast]");
      expect(toastEl).toBeTruthy();
    });

    const closeButton = container.querySelector("[data-close-button]");
    expect(closeButton).toBeTruthy();
    expect(closeButton?.getAttribute("aria-label")).toBe("Close toast");
  });
});
