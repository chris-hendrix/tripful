// Shared TypeScript types for the Tripful platform

/**
 * Standardized API response wrapper with discriminated union pattern
 * @template T The type of data being returned on success
 */
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ErrorResponse;
    };

/**
 * Paginated response wrapper for list endpoints
 * @template T The type of items in the data array
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Re-export user-related types
export type { User, AuthResponse } from './user.js';
