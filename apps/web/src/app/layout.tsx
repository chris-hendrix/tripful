import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers/providers";
import { playfairDisplay } from "@/lib/fonts";

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
    <html lang="en" className={playfairDisplay.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
