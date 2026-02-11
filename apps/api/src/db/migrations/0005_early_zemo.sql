CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_phone" varchar(20) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_trip_phone_unique" UNIQUE("trip_id","invitee_phone")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_organizer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE members SET is_organizer = true FROM trips WHERE members.trip_id = trips.id AND members.user_id = trips.created_by;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_trip_id_idx" ON "invitations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitations_invitee_phone_idx" ON "invitations" USING btree ("invitee_phone");