CREATE INDEX IF NOT EXISTS "accommodations_trip_id_deleted_at_idx" ON "accommodations" USING btree ("trip_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_trip_id_deleted_at_idx" ON "events" USING btree ("trip_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_member_id_deleted_at_idx" ON "member_travel" USING btree ("member_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_travel_trip_id_deleted_at_idx" ON "member_travel" USING btree ("trip_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "members_trip_id_is_organizer_idx" ON "members" USING btree ("trip_id","is_organizer");