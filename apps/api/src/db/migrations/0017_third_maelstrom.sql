CREATE TABLE IF NOT EXISTS "auth_attempts" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"last_failed_at" timestamp with time zone,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blacklisted_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jti" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blacklisted_tokens_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blacklisted_tokens" ADD CONSTRAINT "blacklisted_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blacklisted_tokens_jti_idx" ON "blacklisted_tokens" USING btree ("jti");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blacklisted_tokens_expires_at_idx" ON "blacklisted_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_entries_expires_at_idx" ON "rate_limit_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_trip_id_not_deleted_idx" ON "accommodations" USING btree ("trip_id") WHERE "accommodations"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_trip_id_not_deleted_idx" ON "events" USING btree ("trip_id") WHERE "events"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_trip_id_not_deleted_idx" ON "member_travel" USING btree ("trip_id") WHERE "member_travel"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_trip_id_not_deleted_idx" ON "messages" USING btree ("trip_id") WHERE "messages"."deleted_at" IS NULL AND "messages"."parent_id" IS NULL;