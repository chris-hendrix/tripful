import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers/providers";
import { playfairDisplay, dmSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { SkipLink } from "@/components/skip-link";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tripful.me"
  ),
  title: { default: "Tripful - Group Trip Planner", template: "%s | Tripful" },
  description:
    "Plan group trips together. Coordinate itineraries, accommodations, and events with your travel companions in one place.",
  keywords: [
    "group trip planner",
    "trip planning app",
    "collaborative travel planning",
    "plan trip with friends",
    "group vacation planner",
  ],
  authors: [{ name: "Tripful" }],
  creator: "Tripful",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Tripful",
    title: "Tripful - Group Trip Planner",
    description:
      "Plan group trips together. Coordinate itineraries, accommodations, and events with your travel companions in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tripful - Group Trip Planner",
    description:
      "Plan group trips together. Coordinate itineraries, accommodations, and events with your travel companions in one place.",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tripful",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1a1814",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(playfairDisplay.variable, dmSans.variable)}
    >
      <body className="antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
