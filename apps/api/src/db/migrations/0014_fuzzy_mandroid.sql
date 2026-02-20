ALTER TABLE "members" ADD COLUMN "share_phone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "show_all_members" boolean DEFAULT false NOT NULL;