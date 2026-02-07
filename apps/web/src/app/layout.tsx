import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers/providers";
import { playfairDisplay, dmSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { SkipLink } from "@/components/skip-link";

export const metadata: Metadata = {
  title: { default: "Tripful", template: "%s | Tripful" },
  description: "Plan and share your adventures",
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
