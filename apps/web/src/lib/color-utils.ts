/** Convert a hex color string to HSL components. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convert HSL components to a hex color string. */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Darken a hex color by a given amount (0-1). */
export function darken(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l * (1 - amount)));
}

/** Lighten a hex color by a given amount (0-1). */
export function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + (100 - l) * amount));
}

/** Return an rgba() string for a hex color at the given alpha (0-1). */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Calculate the WCAG 2.0 relative luminance of a hex color (0-1). */
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const r = linearize(parseInt(normalized.slice(0, 2), 16) / 255);
  const g = linearize(parseInt(normalized.slice(2, 4), 16) / 255);
  const b = linearize(parseInt(normalized.slice(4, 6), 16) / 255);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Calculate the WCAG 2.0 contrast ratio between two hex colors (1-21). */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick a readable foreground color (white or dark) for a given background. */
export function readableForeground(bgHex: string): "#ffffff" | "#1a1a1a" {
  const lum = relativeLuminance(bgHex);
  return lum > 0.179 ? "#1a1a1a" : "#ffffff";
}

/** Derive a full theme palette from a single accent hex color. */
export function deriveTheme(hex: string): {
  accent: string;
  accentForeground: string;
  heroGradient: string;
  heroOverlay: string;
  subtleBg: string;
  border: string;
} {
  return {
    accent: hex,
    accentForeground: readableForeground(hex),
    heroGradient: `linear-gradient(135deg, ${darken(hex, 0.3)}, ${hex}, ${lighten(hex, 0.15)})`,
    heroOverlay: withAlpha(hex, 0.6),
    subtleBg: withAlpha(hex, 0.08),
    border: withAlpha(hex, 0.2),
  };
}
