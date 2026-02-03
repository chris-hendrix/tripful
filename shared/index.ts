// Barrel exports for @tripful/shared package

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  User,
  AuthResponse,
} from './types/index';

// Schemas
export {
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
  requestCodeSchema,
  verifyCodeSchema,
  completeProfileSchema,
} from './schemas/index';

// Schema inferred types
export type {
  RequestCodeInput,
  VerifyCodeInput,
  CompleteProfileInput,
} from './schemas/index';

// Utils
export { convertToUTC, formatInTimeZone } from './utils/index';
