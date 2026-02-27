import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "../use-media-query";

describe("useMediaQuery", () => {
  let listeners: Map<string, ((e: MediaQueryListEvent) => void)[]>;

  beforeEach(() => {
    listeners = new Map();

    vi.mocked(window.matchMedia).mockImplementation((query: string) => {
      const eventListeners: ((e: MediaQueryListEvent) => void)[] = [];
      listeners.set(query, eventListeners);

      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(
          (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            eventListeners.push(cb);
          },
        ),
        removeEventListener: vi.fn(
          (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            const idx = eventListeners.indexOf(cb);
            if (idx >= 0) eventListeners.splice(idx, 1);
          },
        ),
        dispatchEvent: vi.fn(),
      };
    });
  });

  it("returns false initially (SSR-safe default)", () => {
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 768px)"),
    );

    // After the effect runs, it syncs with matchMedia (which returns false)
    expect(result.current).toBe(false);
  });

  it("returns true when matchMedia matches", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => {
      const eventListeners: ((e: MediaQueryListEvent) => void)[] = [];
      listeners.set(query, eventListeners);

      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(
          (_event: string, cb: (e: MediaQueryListEvent) => void) => {
            eventListeners.push(cb);
          },
        ),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 768px)"),
    );

    expect(result.current).toBe(true);
  });

  it("updates when media query changes", () => {
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 768px)"),
    );

    expect(result.current).toBe(false);

    const queryListeners = listeners.get("(min-width: 768px)");
    expect(queryListeners).toBeDefined();
    expect(queryListeners!.length).toBeGreaterThan(0);

    act(() => {
      queryListeners!.forEach((cb) =>
        cb({ matches: true } as MediaQueryListEvent),
      );
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerMock = vi.fn();

    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() =>
      useMediaQuery("(min-width: 768px)"),
    );

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("passes the query string to matchMedia", () => {
    renderHook(() => useMediaQuery("(max-width: 480px)"));

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 480px)");
  });

  it("re-evaluates when query changes", () => {
    // First query returns false
    vi.mocked(window.matchMedia).mockImplementation((query: string) => {
      const eventListeners: ((e: MediaQueryListEvent) => void)[] = [];
      listeners.set(query, eventListeners);

      return {
        matches: query === "(min-width: 1024px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: "(min-width: 768px)" } },
    );

    expect(result.current).toBe(false);

    rerender({ query: "(min-width: 1024px)" });

    expect(result.current).toBe(true);
  });
});
