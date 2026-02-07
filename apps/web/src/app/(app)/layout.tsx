import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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

  return <>{children}</>;
}
