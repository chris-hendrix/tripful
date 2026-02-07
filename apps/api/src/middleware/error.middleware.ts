import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Log error with context
  request.log.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query,
    },
  });

  // Zod validation errors from fastify-type-provider-zod
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.validation,
      },
    });
  }

  // Validation errors (Fastify native schema)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.validation,
      },
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    const rateLimitError = error as Error & { customRateLimitMessage?: string };
    return reply.status(429).send({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          rateLimitError.customRateLimitMessage ||
          "Too many requests. Please try again later.",
      },
    });
  }

  // JWT errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }

  // Multipart file upload errors - file too large
  if (
    error.code === "FST_REQ_FILE_TOO_LARGE" ||
    error.code === "FST_FILES_LIMIT" ||
    error.code === "FST_PARTS_LIMIT" ||
    error.code === "FST_FIELDS_LIMIT" ||
    error.message?.toLowerCase().includes("body is too large") ||
    error.message?.toLowerCase().includes("file too large") ||
    error.message?.toLowerCase().includes("files limit") ||
    error.message?.toLowerCase().includes("parts limit") ||
    error.statusCode === 413
  ) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Image must be under 5MB. Please choose a smaller file",
      },
    });
  }

  // Multipart content-type errors
  if (
    error.code === "FST_INVALID_MULTIPART_CONTENT_TYPE" ||
    error.message?.includes("the request is not multipart")
  ) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "No file uploaded",
      },
    });
  }

  // Database errors (PostgreSQL constraint violations)
  if (error.code?.startsWith("23")) {
    return reply.status(409).send({
      success: false,
      error: {
        code: "DATABASE_CONSTRAINT_VIOLATION",
        message: "Database constraint violation",
      },
    });
  }

  // Handle custom @fastify/error instances (typed errors with statusCode and code)
  if (error.statusCode && error.statusCode < 500 && error.code) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Default error (hide internal details in production)
  const isDevelopment = process.env.NODE_ENV === "development";
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: isDevelopment ? error.message : "An unexpected error occurred",
      ...(isDevelopment && { stack: error.stack }),
    },
  });
}
