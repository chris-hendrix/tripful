import { describe, it, expect } from "vitest";
import { detectTemplate } from "../detect-template";

describe("detectTemplate", () => {
  it("matches an exact keyword", () => {
    const result = detectTemplate("bachelor");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("bachelor-party");
  });

  it("matches a substring within a longer name", () => {
    const result = detectTemplate("My Ski Adventure");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ski-trip");
  });

  it("matches bachelorette before bachelor (first-match-wins)", () => {
    const result = detectTemplate("bachelorette party");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("bachelorette-party");
  });

  it("returns null when no keyword matches", () => {
    const result = detectTemplate("Random Trip Name");
    expect(result).toBeNull();
  });

  it("matches case-insensitively", () => {
    const result = detectTemplate("BEACH vacation");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("beach");
  });

  it("matches multi-word keywords", () => {
    const result = detectTemplate("road trip out west");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("road-trip");
  });
});
