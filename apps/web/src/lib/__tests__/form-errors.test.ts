import { describe, it, expect, vi } from "vitest";
import { mapServerErrors } from "../form-errors";
import { APIError } from "../api";

describe("mapServerErrors", () => {
  const createMockSetError = () => vi.fn();

  it("maps a known APIError code to the specified form field", () => {
    const setError = createMockSetError();
    const error = new APIError("VALIDATION_ERROR", "Name is required");

    const result = mapServerErrors(error, setError, {
      VALIDATION_ERROR: "name",
    });

    expect(result).toBe(true);
    expect(setError).toHaveBeenCalledWith("name", {
      type: "server",
      message: "Name is required",
    });
  });

  it("returns false for an APIError with an unmapped code", () => {
    const setError = createMockSetError();
    const error = new APIError("PERMISSION_DENIED", "Not allowed");

    const result = mapServerErrors(error, setError, {
      VALIDATION_ERROR: "name",
    });

    expect(result).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns false for a non-APIError", () => {
    const setError = createMockSetError();
    const error = new Error("Network error");

    const result = mapServerErrors(error, setError, {
      VALIDATION_ERROR: "name",
    });

    expect(result).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns false for a TypeError", () => {
    const setError = createMockSetError();
    const error = new TypeError("fetch failed");

    const result = mapServerErrors(error, setError, {
      VALIDATION_ERROR: "name",
    });

    expect(result).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("maps different error codes to different form fields", () => {
    const setError = createMockSetError();
    const error = new APIError("DUPLICATE_NAME", "Trip name already exists");

    const result = mapServerErrors(error, setError, {
      VALIDATION_ERROR: "name",
      DUPLICATE_NAME: "name",
      INVALID_DATE: "startDate",
    });

    expect(result).toBe(true);
    expect(setError).toHaveBeenCalledWith("name", {
      type: "server",
      message: "Trip name already exists",
    });
  });

  it("handles an empty field map gracefully", () => {
    const setError = createMockSetError();
    const error = new APIError("VALIDATION_ERROR", "Bad input");

    const result = mapServerErrors(error, setError, {});

    expect(result).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
