/**
 * API client for communicating with the Tripful backend
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Base URL for the API server (without /api suffix).
 * Used for resolving upload paths to full URLs.
 */
const API_BASE_URL = API_URL.replace(/\/api$/, "");

/**
 * Convert a relative upload path (e.g. /uploads/uuid.jpg) to a full URL
 * pointing to the API server. Needed because Next.js Image optimization
 * can't fetch images through dev rewrites.
 *
 * Returns undefined for null/undefined input. Passes through absolute
 * URLs (http/https) and blob URLs unchanged.
 */
export function getUploadUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API_BASE_URL}${path}`;
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Generic API request wrapper with automatic error handling and credentials
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data?.error?.code || "UNKNOWN_ERROR";
      const errorMessage = data?.error?.message || "An error occurred";
      throw new APIError(errorCode, errorMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

/**
 * Check the health status of the backend API
 */
export async function checkHealth(): Promise<{
  status: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error("Health check failed");
  }
  return response.json();
}
