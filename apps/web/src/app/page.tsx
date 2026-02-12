import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");

  if (authToken?.value) {
    redirect("/trips");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Decorative accent line */}
      <div className="mb-6 h-1 w-16 rounded-full bg-accent" />

      {/* Wordmark */}
      <h1 className="mb-4 text-6xl font-bold tracking-tight text-foreground sm:text-7xl font-[family-name:var(--font-playfair)]">
        Tripful
      </h1>

      {/* Tagline */}
      <p className="mb-10 max-w-md text-center text-lg text-muted-foreground">
        Plan and share your adventures
      </p>

      {/* CTA */}
      <Button variant="gradient" size="lg" className="rounded-xl px-10" asChild>
        <Link href="/login">Get started</Link>
      </Button>

      {/* Decorative bottom element */}
      <div className="mt-16 flex items-center gap-3">
        <div className="h-px w-12 bg-border" />
        <div className="h-2 w-2 rotate-45 border border-primary/40" />
        <div className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}
