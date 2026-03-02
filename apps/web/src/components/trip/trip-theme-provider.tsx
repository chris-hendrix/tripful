"use client";

import type { ReactNode } from "react";
import { THEME_PRESETS } from "@tripful/shared/config";
import { THEME_FONTS } from "@tripful/shared/config";
import { resolveThemeStyles } from "@/lib/theme-styles";

interface TripThemeProviderProps {
  themeId: string | null | undefined;
  themeFont: string | null | undefined;
  children: ReactNode;
}

/**
 * Wraps children in a div that overrides event-type CSS custom properties
 * based on the selected theme preset. Uses `className="contents"` so the
 * wrapper does not affect layout.
 *
 * When no theme is selected (themeId is null/undefined or not found),
 * children are rendered directly without a wrapper.
 */
export function TripThemeProvider({
  themeId,
  themeFont,
  children,
}: TripThemeProviderProps) {
  const preset = THEME_PRESETS.find((p) => p.id === themeId) ?? null;

  if (!preset) {
    return <>{children}</>;
  }

  const styleOverrides: Record<string, string> = resolveThemeStyles(preset);

  if (themeFont && themeFont in THEME_FONTS) {
    styleOverrides.fontFamily =
      THEME_FONTS[themeFont as keyof typeof THEME_FONTS];
  }

  return (
    <div style={styleOverrides} className="contents">
      {children}
    </div>
  );
}
