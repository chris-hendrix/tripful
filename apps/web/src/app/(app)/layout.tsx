import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token");

  if (!authToken?.value) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader />
      <main
        id="main-content"
        className="bg-gradient-to-b from-background via-background to-secondary/30 min-h-screen"
      >
        {children}
      </main>
    </>
  );
}
