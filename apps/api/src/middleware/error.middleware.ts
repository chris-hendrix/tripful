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

  const requestId = request.id;

  // Zod validation errors from fastify-type-provider-zod
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.validation,
      },
      requestId,
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
      requestId,
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
      requestId,
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
      requestId,
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
      requestId,
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
      requestId,
    });
  }

  // Handle custom @fastify/error instances (typed errors with statusCode and code)
  // This catches AccountLockedError (429), InvalidCodeError (400), etc.
  if (error.statusCode && error.statusCode < 500 && error.code) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      requestId,
    });
  }

  // Rate limit errors (plain objects thrown by @fastify/rate-limit, no code property)
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
      },
      requestId,
    });
  }

  // Default error (hide internal details unless configured to expose)
  const exposeDetails = request.server.config.EXPOSE_ERROR_DETAILS;
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: exposeDetails ? error.message : "An unexpected error occurred",
      ...(exposeDetails && { stack: error.stack }),
    },
    requestId,
  });
}
