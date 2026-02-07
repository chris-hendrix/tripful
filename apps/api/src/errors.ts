import createError from "@fastify/error";

// Auth errors
export const UnauthorizedError = createError("UNAUTHORIZED", "%s", 401);
export const ProfileIncompleteError = createError(
  "PROFILE_INCOMPLETE",
  "%s",
  403,
);

// Trip errors
export const TripNotFoundError = createError(
  "NOT_FOUND",
  "Trip not found",
  404,
);
export const PermissionDeniedError = createError(
  "PERMISSION_DENIED",
  "%s",
  403,
);
export const MemberLimitExceededError = createError(
  "MEMBER_LIMIT_EXCEEDED",
  "%s",
  409,
);
export const CoOrganizerNotFoundError = createError(
  "CO_ORGANIZER_NOT_FOUND",
  "%s",
  400,
);
export const CannotRemoveCreatorError = createError(
  "CANNOT_REMOVE_CREATOR",
  "Cannot remove trip creator as co-organizer",
  400,
);
export const DuplicateMemberError = createError("DUPLICATE_MEMBER", "%s", 409);
export const CoOrganizerNotInTripError = createError(
  "NOT_FOUND",
  "Co-organizer not found in trip",
  404,
);

// Itinerary errors
export const EventNotFoundError = createError(
  "NOT_FOUND",
  "Event not found",
  404,
);
export const AccommodationNotFoundError = createError(
  "NOT_FOUND",
  "Accommodation not found",
  404,
);
export const MemberTravelNotFoundError = createError(
  "NOT_FOUND",
  "Member travel not found",
  404,
);
export const EventConflictError = createError("EVENT_CONFLICT", "%s", 409);
export const InvalidDateRangeError = createError(
  "INVALID_DATE_RANGE",
  "%s",
  400,
);

// Upload errors
export const FileTooLargeError = createError("FILE_TOO_LARGE", "%s", 400);
export const InvalidFileTypeError = createError("INVALID_FILE_TYPE", "%s", 400);

// Generic
export const InvalidCodeError = createError("INVALID_CODE", "%s", 400);
