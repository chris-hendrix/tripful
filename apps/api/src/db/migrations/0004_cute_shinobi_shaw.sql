CREATE TYPE "public"."event_type" AS ENUM('travel', 'meal', 'activity');--> statement-breakpoint
CREATE TYPE "public"."member_travel_type" AS ENUM('arrival', 'departure');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"description" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"links" text[],
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"event_type" "event_type" NOT NULL,
	"location" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"links" text[],
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_travel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"travel_type" "member_travel_type" NOT NULL,
	"time" timestamp with time zone NOT NULL,
	"location" text,
	"details" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_travel" ADD CONSTRAINT "member_travel_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_travel" ADD CONSTRAINT "member_travel_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_travel" ADD CONSTRAINT "member_travel_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_trip_id_idx" ON "accommodations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_created_by_idx" ON "accommodations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_check_in_idx" ON "accommodations" USING btree ("check_in");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accommodations_deleted_at_idx" ON "accommodations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_trip_id_idx" ON "events" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_by_idx" ON "events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_deleted_at_idx" ON "events" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_trip_id_idx" ON "member_travel" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_member_id_idx" ON "member_travel" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_time_idx" ON "member_travel" USING btree ("time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_deleted_at_idx" ON "member_travel" USING btree ("deleted_at");