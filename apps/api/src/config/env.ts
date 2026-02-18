import { z } from "zod";
import { config } from "dotenv";

// Load environment variables (.env.local takes precedence over .env)
config({ path: [".env.local", ".env"] });

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z
    .string()
    .default("8000")
    .pipe(z.string().regex(/^\d+$/, "PORT must be a number").transform(Number)),
  HOST: z.string().default("0.0.0.0"),

  // Database
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL URL")
    .refine(
      (url) => url.startsWith("postgresql://"),
      "DATABASE_URL must start with postgresql://",
    ),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),

  // Frontend
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:3000"),

  // Proxy
  TRUST_PROXY: z.coerce.boolean().default(false),

  // Security & Behavior Flags
  COOKIE_SECURE: z.coerce
    .boolean()
    .default(process.env.NODE_ENV === "production"),
  EXPOSE_ERROR_DETAILS: z.coerce
    .boolean()
    .default(process.env.NODE_ENV === "development"),
  ENABLE_FIXED_VERIFICATION_CODE: z.coerce
    .boolean()
    .default(process.env.NODE_ENV !== "production"),

  // Logging
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // File Upload Configuration
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE: z
    .string()
    .default("5242880")
    .pipe(
      z
        .string()
        .regex(/^\d+$/, "MAX_FILE_SIZE must be a number")
        .transform(Number)
        .refine((n) => n > 0, "MAX_FILE_SIZE must be positive"),
    ),
  ALLOWED_MIME_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp")
    .pipe(
      z
        .string()
        .transform((val) => val.split(",").map((type) => type.trim()))
        .refine(
          (types) => types.every((type) => type.startsWith("image/")),
          "All ALLOWED_MIME_TYPES must start with 'image/'",
        ),
    ),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
    }
    process.exit(1);
  }
}

export const env = validateEnv();
