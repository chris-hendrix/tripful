import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { APIError, apiRequest } from "./api";

describe("APIError", () => {
  it("creates an error with code and message", () => {
    const error = new APIError("VALIDATION_ERROR", "Invalid input");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("APIError");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Invalid input");
  });

  it("preserves stack trace", () => {
    const error = new APIError("TEST_ERROR", "Test message");

    expect(error.stack).toBeDefined();
  });
});

describe("apiRequest", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes a successful API call and returns typed data", async () => {
    const mockData = { user: { id: "123", name: "Test User" } };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await apiRequest<typeof mockData>("/auth/me");

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me"),
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("automatically includes credentials: include", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiRequest("/test");

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("sets Content-Type: application/json header when body is present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiRequest("/test", { body: JSON.stringify({ key: "value" }) });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("does not set Content-Type header when no body is present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiRequest("/test", { method: "DELETE" });

    const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = callArgs.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("allows custom headers to override defaults", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiRequest("/test", {
      headers: {
        "Content-Type": "text/plain",
        "X-Custom-Header": "value",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "text/plain",
          "X-Custom-Header": "value",
        }),
      }),
    );
  });

  it("throws APIError with correct code and message on non-2xx response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid phone number",
        },
      }),
    } as Response);

    try {
      await apiRequest("/test");
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("VALIDATION_ERROR");
        expect(error.message).toBe("Invalid phone number");
      }
    }
  });

  it("throws APIError with fallback values on malformed error response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    try {
      await apiRequest("/test");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("UNKNOWN_ERROR");
        expect(error.message).toBe("An error occurred");
      }
    }
  });

  it("throws APIError with fallback values when error object is incomplete", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "SERVER_ERROR" } }),
    } as Response);

    try {
      await apiRequest("/test");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("SERVER_ERROR");
        expect(error.message).toBe("An error occurred");
      }
    }
  });

  it("propagates network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    await expect(apiRequest("/test")).rejects.toThrow("Network error");
  });

  it("handles different HTTP methods", async () => {
    const methods = ["GET", "POST", "PUT", "DELETE"];

    for (const method of methods) {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await apiRequest("/test", { method });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method }),
      );
    }
  });

  it("properly serializes request body for POST request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const body = { phoneNumber: "+15551234567" };
    await apiRequest("/auth/request-code", {
      method: "POST",
      body: JSON.stringify(body),
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  });

  it("properly serializes request body for PUT request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const body = { displayName: "Test User", timezone: "America/New_York" };
    await apiRequest("/auth/complete-profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(body),
      }),
    );
  });

  it("constructs correct URL with API base", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiRequest("/auth/me");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/me$/),
      expect.any(Object),
    );
  });

  it("handles 401 unauthorized errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
    } as Response);

    try {
      await apiRequest("/protected");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.message).toBe("Authentication required");
      }
    }
  });

  it("handles 404 not found errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      }),
    } as Response);

    try {
      await apiRequest("/nonexistent");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("NOT_FOUND");
        expect(error.message).toBe("Resource not found");
      }
    }
  });

  it("handles 500 internal server errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong",
        },
      }),
    } as Response);

    try {
      await apiRequest("/error");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(error.message).toBe("Something went wrong");
      }
    }
  });

  it("handles rate limit errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
        },
      }),
    } as Response);

    try {
      await apiRequest("/test");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      if (error instanceof APIError) {
        expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(error.message).toBe("Too many requests");
      }
    }
  });
});
