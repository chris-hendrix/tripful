import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "../responsive-dialog";

function mockMatchMedia(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("ResponsiveDialog", () => {
  beforeEach(() => {
    // Default to mobile (matches: false for min-width: 768px)
    mockMatchMedia(false);
  });

  it("renders all sub-components when open", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Test description
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <p>Body content</p>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>Footer content</ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    expect(screen.getByText("Test Title")).toBeTruthy();
    expect(screen.getByText("Test description")).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
    expect(screen.getByText("Footer content")).toBeTruthy();
  });

  it("renders content with bottom-sheet classes on mobile", () => {
    mockMatchMedia(false);

    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    const content = document.querySelector(
      '[data-slot="responsive-dialog-content"]',
    );
    expect(content).toBeTruthy();
    expect(content?.className).toContain("bottom-0");
    expect(content?.className).toContain("rounded-t-2xl");
    expect(content?.className).toContain("slide-in-from-bottom");
  });

  it("renders content with centered dialog classes on desktop", () => {
    mockMatchMedia(true);

    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    const content = document.querySelector(
      '[data-slot="responsive-dialog-content"]',
    );
    expect(content).toBeTruthy();
    expect(content?.className).toContain("top-[50%]");
    expect(content?.className).toContain("left-[50%]");
    expect(content?.className).toContain("translate-x-[-50%]");
    expect(content?.className).toContain("zoom-in-95");
  });

  it("renders overlay with fixed positioning and z-50", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    const overlay = document.querySelector(
      '[data-slot="responsive-dialog-overlay"]',
    );
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain("fixed");
    expect(overlay?.className).toContain("inset-0");
    expect(overlay?.className).toContain("z-50");
  });

  it("renders content inside a portal (outside the render container)", () => {
    const { container } = render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    // Content should NOT be inside the render container (it's portaled)
    const contentInContainer = container.querySelector(
      '[data-slot="responsive-dialog-content"]',
    );
    expect(contentInContainer).toBeFalsy();

    // Content should be in the document (rendered via portal)
    const contentInDocument = document.querySelector(
      '[data-slot="responsive-dialog-content"]',
    );
    expect(contentInDocument).toBeTruthy();
  });

  it("shows close button by default", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    expect(screen.getByText("Close")).toBeTruthy();
  });

  it("hides close button when showCloseButton is false", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent showCloseButton={false}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    expect(screen.queryByText("Close")).toBeFalsy();
  });

  it("renders body with scrollable overflow", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>Scrollable content</ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    const body = document.querySelector(
      '[data-slot="responsive-dialog-body"]',
    );
    expect(body).toBeTruthy();
    expect(body?.className).toContain("overflow-y-auto");
    expect(body?.className).toContain("flex-1");
  });

  it("renders footer with close button when showCloseButton is true", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter showCloseButton>
            Extra footer content
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    const footer = document.querySelector(
      '[data-slot="responsive-dialog-footer"]',
    );
    expect(footer).toBeTruthy();
    expect(footer?.className).toContain("border-t");
    expect(screen.getByText("Extra footer content")).toBeTruthy();
  });

  it("applies data-slot attributes to all sub-components", () => {
    render(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>Body</ResponsiveDialogBody>
          <ResponsiveDialogFooter>Footer</ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    expect(
      document.querySelector('[data-slot="responsive-dialog-overlay"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-content"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-header"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-title"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-description"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-body"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="responsive-dialog-footer"]'),
    ).toBeTruthy();
  });

  it("passes onOpenChange callback", () => {
    const onOpenChange = vi.fn();

    render(
      <ResponsiveDialog open={true} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );

    // The dialog should render (it's open)
    expect(screen.getByText("Test Title")).toBeTruthy();
  });
});
