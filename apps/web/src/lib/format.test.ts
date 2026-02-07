import { describe, it, expect } from "vitest";
import { formatDateRange, getInitials } from "./format";

describe("formatDateRange", () => {
  it("returns 'Dates TBD' when both dates are null", () => {
    expect(formatDateRange(null, null)).toBe("Dates TBD");
  });

  it("returns 'Starts ...' when only start date is provided", () => {
    const result = formatDateRange("2026-03-15", null);
    expect(result).toBe("Starts Mar 15, 2026");
  });

  it("returns 'Ends ...' when only end date is provided", () => {
    const result = formatDateRange(null, "2026-03-20");
    expect(result).toBe("Ends Mar 20, 2026");
  });

  it("formats same-month date range correctly", () => {
    const result = formatDateRange("2026-03-15", "2026-03-20");
    expect(result).toBe("Mar 15 - 20, 2026");
  });

  it("formats different-month date range correctly", () => {
    const result = formatDateRange("2026-03-28", "2026-04-05");
    expect(result).toBe("Mar 28 - Apr 5, 2026");
  });

  it("formats single-day range correctly", () => {
    const result = formatDateRange("2026-07-04", "2026-07-04");
    expect(result).toBe("Jul 4 - 4, 2026");
  });

  it("formats year-boundary date range correctly", () => {
    const result = formatDateRange("2025-12-28", "2026-01-05");
    expect(result).toBe("Dec 28 - Jan 5, 2026");
  });

  it("throws for invalid date format", () => {
    expect(() => formatDateRange("invalid", null)).toThrow(
      "Invalid date format",
    );
  });
});

describe("getInitials", () => {
  it("returns first letter of single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns first letters of two-part name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns at most 2 characters for multi-part names", () => {
    expect(getInitials("Jean Claude Van Damme")).toBe("JC");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("alice bob")).toBe("AB");
  });

  it("handles single character name", () => {
    expect(getInitials("A")).toBe("A");
  });
});
