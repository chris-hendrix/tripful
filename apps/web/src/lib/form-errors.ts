import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { APIError } from "@/lib/api";

/**
 * Maps API server errors to form field errors via setError().
 * Returns true if the error was mapped to a form field, false otherwise.
 * When false, the caller should fall back to a toast notification.
 */
export function mapServerErrors<T extends FieldValues>(
  error: Error,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>>,
): boolean {
  if (!(error instanceof APIError)) return false;

  const fieldName = fieldMap[error.code];
  if (fieldName) {
    setError(fieldName, { type: "server", message: error.message });
    return true;
  }

  return false;
}
