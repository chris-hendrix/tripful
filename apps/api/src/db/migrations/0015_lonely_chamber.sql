ALTER TABLE "muted_members" DROP CONSTRAINT "muted_members_muted_by_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "muted_members" ADD CONSTRAINT "muted_members_muted_by_users_id_fk" FOREIGN KEY ("muted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
