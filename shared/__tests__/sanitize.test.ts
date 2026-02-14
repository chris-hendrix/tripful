import { describe, it, expect } from "vitest";
import { stripControlChars } from "../utils/sanitize";

describe("stripControlChars", () => {
  it("should pass through normal strings unchanged", () => {
    expect(stripControlChars("Hello World")).toBe("Hello World");
    expect(stripControlChars("Trip to Paris 2026!")).toBe(
      "Trip to Paris 2026!",
    );
    expect(stripControlChars("café résumé naïve")).toBe("café résumé naïve");
  });

  it("should preserve newlines, carriage returns, and tabs", () => {
    expect(stripControlChars("line1\nline2")).toBe("line1\nline2");
    expect(stripControlChars("line1\r\nline2")).toBe("line1\r\nline2");
    expect(stripControlChars("col1\tcol2")).toBe("col1\tcol2");
  });

  it("should strip null bytes", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
    expect(stripControlChars("\x00\x00\x00")).toBe("");
  });

  it("should strip C0 control characters (except tab, newline, carriage return)", () => {
    // SOH, STX, ETX, BEL, BS, VT, FF, SO, SI, etc.
    expect(stripControlChars("a\x01b\x02c\x03d")).toBe("abcd");
    expect(stripControlChars("hello\x07world")).toBe("helloworld"); // BEL
    expect(stripControlChars("hello\x08world")).toBe("helloworld"); // BS
    expect(stripControlChars("hello\x0Bworld")).toBe("helloworld"); // VT
    expect(stripControlChars("hello\x0Cworld")).toBe("helloworld"); // FF
    expect(stripControlChars("hello\x1Bworld")).toBe("helloworld"); // ESC
  });

  it("should strip C1 control characters (U+007F-U+009F)", () => {
    expect(stripControlChars("hello\x7Fworld")).toBe("helloworld"); // DEL
    expect(stripControlChars("hello\x80world")).toBe("helloworld");
    expect(stripControlChars("hello\x9Fworld")).toBe("helloworld");
  });

  it("should handle empty strings", () => {
    expect(stripControlChars("")).toBe("");
  });

  it("should handle strings that are entirely control characters", () => {
    expect(stripControlChars("\x00\x01\x02\x03")).toBe("");
  });

  it("should preserve unicode characters", () => {
    expect(stripControlChars("日本語テスト")).toBe("日本語テスト");
    expect(stripControlChars("🏖️ Beach Trip")).toBe("🏖️ Beach Trip");
  });
});
