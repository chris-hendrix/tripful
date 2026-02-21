import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verify",
  description: "Verify your email to access Tripful.",
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return children;
}
