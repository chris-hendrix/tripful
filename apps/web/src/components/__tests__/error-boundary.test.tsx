import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../error-boundary";

// Suppress console.error from ErrorBoundary during tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  return () => {
    console.error = originalConsoleError;
  };
});

// Track whether the component should throw via a module-level ref
let throwOnRender = false;

function ConditionalThrow() {
  if (throwOnRender) {
    throw new Error("Test error");
  }
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    throwOnRender = false;
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Working content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Working content")).toBeDefined();
  });

  it("shows default fallback UI when a child throws", () => {
    throwOnRender = true;

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(
      screen.getByText("An unexpected error occurred. Please try again."),
    ).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();
  });

  it("shows custom fallback when provided", () => {
    throwOnRender = true;

    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error UI")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("resets error state and re-renders children when Try again is clicked", async () => {
    const user = userEvent.setup();
    throwOnRender = true;

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Stop throwing before clicking retry
    throwOnRender = false;

    await user.click(screen.getByText("Try again"));

    // After reset, the ErrorBoundary re-renders children which no longer throw
    expect(screen.getByText("Child content")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("does not show fallback when children render successfully", () => {
    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Child content")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("calls onReset when Try again is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    throwOnRender = true;

    render(
      <ErrorBoundary onReset={onReset}>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Stop throwing before clicking retry
    throwOnRender = false;

    await user.click(screen.getByText("Try again"));

    expect(onReset).toHaveBeenCalledTimes(1);
    // Children should also re-render after reset
    expect(screen.getByText("Child content")).toBeDefined();
  });

  it("works without onReset prop (backward compatibility)", async () => {
    const user = userEvent.setup();
    throwOnRender = true;

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Stop throwing before clicking retry
    throwOnRender = false;

    // Should not throw even without onReset prop
    await user.click(screen.getByText("Try again"));

    expect(screen.getByText("Child content")).toBeDefined();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });
});
