ALTER TABLE "verification_codes" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "locked_until" timestamp with time zone;