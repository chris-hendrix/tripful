import { describe, expect, it } from "vitest";
import {
  getDayLabel,
  getMonthAbbrev,
  getWeekdayAbbrev,
  calculateNights,
} from "../timezone";

describe("getDayLabel", () => {
  it("formats a date in a UTC+ timezone without day shift", () => {
    // UTC+14 (Line Islands) — the most extreme positive offset
    const label = getDayLabel("2026-07-15", "Pacific/Kiritimati");
    expect(label).toMatch(/Jul 15/);
  });

  it("formats a date in a UTC- timezone without day shift", () => {
    // UTC-11 (American Samoa)
    const label = getDayLabel("2026-07-15", "Pacific/Pago_Pago");
    expect(label).toMatch(/Jul 15/);
  });

  it("formats a date in UTC without day shift", () => {
    const label = getDayLabel("2026-07-15", "UTC");
    expect(label).toMatch(/Jul 15/);
  });
});

describe("getMonthAbbrev", () => {
  it("returns correct month in UTC+14", () => {
    expect(getMonthAbbrev("2026-01-01", "Pacific/Kiritimati")).toBe("Jan");
  });

  it("returns correct month in UTC-11", () => {
    expect(getMonthAbbrev("2026-12-31", "Pacific/Pago_Pago")).toBe("Dec");
  });
});

describe("getWeekdayAbbrev", () => {
  it("returns correct weekday in UTC+14", () => {
    // 2026-07-15 is a Wednesday
    expect(getWeekdayAbbrev("2026-07-15", "Pacific/Kiritimati")).toBe("Wed");
  });

  it("returns correct weekday in UTC-11", () => {
    expect(getWeekdayAbbrev("2026-07-15", "Pacific/Pago_Pago")).toBe("Wed");
  });
});

describe("calculateNights", () => {
  it("calculates nights from YYYY-MM-DD strings", () => {
    expect(calculateNights("2026-07-15", "2026-07-20")).toBe(5);
  });

  it("calculates nights from ISO datetime strings", () => {
    expect(
      calculateNights(
        "2026-07-15T14:00:00.000Z",
        "2026-07-20T11:00:00.000Z",
      ),
    ).toBe(5);
  });

  it("returns 0 for same-day check-in/check-out", () => {
    expect(calculateNights("2026-07-15", "2026-07-15")).toBe(0);
  });

  it("returns correct result regardless of server timezone", () => {
    // Both use noon UTC internally, so this should always be 1
    expect(calculateNights("2026-12-31", "2027-01-01")).toBe(1);
  });
});
