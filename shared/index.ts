// Barrel exports for @tripful/shared package

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  User,
  AuthResponse,
  Trip,
  TripSummary,
  TripDetail,
  GetTripsResponse,
  GetTripResponse,
  CreateTripResponse,
  UpdateTripResponse,
} from "./types/index";

// Schemas
export {
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
  requestCodeSchema,
  verifyCodeSchema,
  completeProfileSchema,
  createTripSchema,
  updateTripSchema,
  addCoOrganizerSchema,
} from "./schemas/index";

// Schema inferred types
export type {
  RequestCodeInput,
  VerifyCodeInput,
  CompleteProfileInput,
  CreateTripInput,
  UpdateTripInput,
  AddCoOrganizerInput,
} from "./schemas/index";

// Utils
export { convertToUTC, formatInTimeZone } from "./utils/index";
