import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "../format";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:30Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("just now");
  });

  it("returns minutes ago for timestamps less than 60 minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:05:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("5m ago");
  });

  it("returns hours ago for timestamps less than 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T15:00:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("3h ago");
  });

  it("returns days ago for timestamps less than 7 days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-17T12:00:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("2d ago");
  });

  it("returns formatted date for timestamps 7 or more days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T12:00:00Z"));

    const result = formatRelativeTime("2026-02-15T12:00:00Z");
    // Should contain "Feb" and "15"
    expect(result).toContain("Feb");
    expect(result).toContain("15");
  });

  it("returns 1m ago at exactly 60 seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:01:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("1m ago");
  });

  it("returns 1h ago at exactly 60 minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T13:00:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("1h ago");
  });

  it("returns 1d ago at exactly 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-16T12:00:00Z"));

    expect(formatRelativeTime("2026-02-15T12:00:00Z")).toBe("1d ago");
  });
});
