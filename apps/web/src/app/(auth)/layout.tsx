import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background linen-texture">
      <main
        id="main-content"
        className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4"
      >
        {/* Journiful wordmark */}
        <Link
          href="/"
          className="mb-8 font-display text-3xl font-bold tracking-tight text-foreground"
        >
          Journiful
        </Link>

        {children}
      </main>
    </div>
  );
}
