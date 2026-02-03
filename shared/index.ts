// Barrel exports for @tripful/shared package

// Types
export type {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  User,
  AuthResponse,
} from './types/index.js';

// Schemas
export {
  phoneNumberSchema,
  emailSchema,
  uuidSchema,
  requestCodeSchema,
  verifyCodeSchema,
  completeProfileSchema,
} from './schemas/index.js';

// Schema inferred types
export type {
  RequestCodeInput,
  VerifyCodeInput,
  CompleteProfileInput,
} from './schemas/index.js';

// Utils
export { convertToUTC, formatInTimeZone } from './utils/index.js';
