import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:8000/api";

export async function serverApiRequest<T>(endpoint: string): Promise<T> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}
