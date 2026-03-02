import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  darken,
  lighten,
  withAlpha,
  relativeLuminance,
  contrastRatio,
  readableForeground,
  deriveTheme,
} from "../color-utils";

describe("hexToHsl", () => {
  it("converts red (#ff0000) correctly", () => {
    const { h, s, l } = hexToHsl("#ff0000");
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it("converts green (#00ff00) correctly", () => {
    const { h, s, l } = hexToHsl("#00ff00");
    expect(h).toBeCloseTo(120, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it("converts blue (#0000ff) correctly", () => {
    const { h, s, l } = hexToHsl("#0000ff");
    expect(h).toBeCloseTo(240, 0);
    expect(s).toBeCloseTo(100, 0);
    expect(l).toBeCloseTo(50, 0);
  });

  it("converts white (#ffffff) correctly", () => {
    const { l } = hexToHsl("#ffffff");
    expect(l).toBeCloseTo(100, 0);
  });

  it("converts black (#000000) correctly", () => {
    const { l } = hexToHsl("#000000");
    expect(l).toBeCloseTo(0, 0);
  });
});

describe("hslToHex", () => {
  it("converts red HSL back to hex", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
  });

  it("converts green HSL back to hex", () => {
    expect(hslToHex(120, 100, 50)).toBe("#00ff00");
  });

  it("converts blue HSL back to hex", () => {
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
  });

  it("converts white HSL back to hex", () => {
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
  });

  it("converts black HSL back to hex", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000");
  });
});

describe("hex<->HSL round-trip", () => {
  it("round-trips primary colors correctly", () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000"];
    for (const color of colors) {
      const { h, s, l } = hexToHsl(color);
      expect(hslToHex(h, s, l)).toBe(color);
    }
  });

  it("round-trips arbitrary colors with close fidelity", () => {
    const colors = ["#3a7bd5", "#e74c3c", "#2ecc71", "#9b59b6"];
    for (const color of colors) {
      const { h, s, l } = hexToHsl(color);
      const result = hslToHex(h, s, l);
      // Allow +-1 in each channel due to rounding
      const origR = parseInt(color.slice(1, 3), 16);
      const origG = parseInt(color.slice(3, 5), 16);
      const origB = parseInt(color.slice(5, 7), 16);
      const resR = parseInt(result.slice(1, 3), 16);
      const resG = parseInt(result.slice(3, 5), 16);
      const resB = parseInt(result.slice(5, 7), 16);
      expect(Math.abs(origR - resR)).toBeLessThanOrEqual(1);
      expect(Math.abs(origG - resG)).toBeLessThanOrEqual(1);
      expect(Math.abs(origB - resB)).toBeLessThanOrEqual(1);
    }
  });
});

describe("darken", () => {
  it("darkening black stays black", () => {
    expect(darken("#000000", 0.5)).toBe("#000000");
  });

  it("darkening white by 1.0 gives black", () => {
    expect(darken("#ffffff", 1.0)).toBe("#000000");
  });

  it("returns a valid 7-char hex string", () => {
    const result = darken("#3a7bd5", 0.3);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("produces a darker color than the input", () => {
    const original = hexToHsl("#3a7bd5");
    const darkened = hexToHsl(darken("#3a7bd5", 0.3));
    expect(darkened.l).toBeLessThan(original.l);
  });
});

describe("lighten", () => {
  it("lightening white stays white", () => {
    expect(lighten("#ffffff", 0.5)).toBe("#ffffff");
  });

  it("lightening black by 1.0 gives white", () => {
    expect(lighten("#000000", 1.0)).toBe("#ffffff");
  });

  it("returns a valid 7-char hex string", () => {
    const result = lighten("#3a7bd5", 0.3);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("produces a lighter color than the input", () => {
    const original = hexToHsl("#3a7bd5");
    const lightened = hexToHsl(lighten("#3a7bd5", 0.3));
    expect(lightened.l).toBeGreaterThan(original.l);
  });
});

describe("darken/lighten bounds", () => {
  it("darken always returns a valid 7-char hex string", () => {
    const amounts = [0, 0.1, 0.5, 0.9, 1.0];
    for (const amount of amounts) {
      expect(darken("#abcdef", amount)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("lighten always returns a valid 7-char hex string", () => {
    const amounts = [0, 0.1, 0.5, 0.9, 1.0];
    for (const amount of amounts) {
      expect(lighten("#abcdef", amount)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("withAlpha", () => {
  it("returns an rgba() string", () => {
    const result = withAlpha("#ff0000", 0.5);
    expect(result).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("handles full opacity", () => {
    const result = withAlpha("#000000", 1);
    expect(result).toBe("rgba(0, 0, 0, 1)");
  });

  it("handles zero opacity", () => {
    const result = withAlpha("#ffffff", 0);
    expect(result).toBe("rgba(255, 255, 255, 0)");
  });
});

describe("relativeLuminance", () => {
  it("white has luminance close to 1.0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1.0, 2);
  });

  it("black has luminance close to 0.0", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0.0, 2);
  });

  it("returns a value between 0 and 1", () => {
    const lum = relativeLuminance("#3a7bd5");
    expect(lum).toBeGreaterThanOrEqual(0);
    expect(lum).toBeLessThanOrEqual(1);
  });
});

describe("contrastRatio", () => {
  it("black vs white is approximately 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("same color has ratio of approximately 1", () => {
    expect(contrastRatio("#3a7bd5", "#3a7bd5")).toBeCloseTo(1, 2);
  });

  it("is symmetric", () => {
    const ratio1 = contrastRatio("#ff0000", "#0000ff");
    const ratio2 = contrastRatio("#0000ff", "#ff0000");
    expect(ratio1).toBeCloseTo(ratio2, 5);
  });
});

describe("readableForeground", () => {
  it("returns '#ffffff' on dark backgrounds", () => {
    expect(readableForeground("#000000")).toBe("#ffffff");
    expect(readableForeground("#1a1a1a")).toBe("#ffffff");
    expect(readableForeground("#333333")).toBe("#ffffff");
  });

  it("returns '#1a1a1a' on light backgrounds", () => {
    expect(readableForeground("#ffffff")).toBe("#1a1a1a");
    expect(readableForeground("#f0f0f0")).toBe("#1a1a1a");
    expect(readableForeground("#ffff00")).toBe("#1a1a1a");
  });
});

describe("deriveTheme", () => {
  it("returns an object with all expected keys", () => {
    const theme = deriveTheme("#3a7bd5");
    expect(theme).toHaveProperty("accent");
    expect(theme).toHaveProperty("accentForeground");
    expect(theme).toHaveProperty("heroGradient");
    expect(theme).toHaveProperty("heroOverlay");
    expect(theme).toHaveProperty("subtleBg");
    expect(theme).toHaveProperty("border");
  });

  it("accent is the input color", () => {
    expect(deriveTheme("#3a7bd5").accent).toBe("#3a7bd5");
  });

  it("accentForeground is white or dark", () => {
    const fg = deriveTheme("#3a7bd5").accentForeground;
    expect(["#ffffff", "#1a1a1a"]).toContain(fg);
  });

  it("heroGradient contains 'linear-gradient'", () => {
    expect(deriveTheme("#3a7bd5").heroGradient).toMatch(/linear-gradient/);
  });

  it("heroOverlay contains 'rgba'", () => {
    expect(deriveTheme("#3a7bd5").heroOverlay).toMatch(/rgba/);
  });

  it("subtleBg contains 'rgba'", () => {
    expect(deriveTheme("#3a7bd5").subtleBg).toMatch(/rgba/);
  });

  it("border contains 'rgba'", () => {
    expect(deriveTheme("#3a7bd5").border).toMatch(/rgba/);
  });
});
