CREATE INDEX IF NOT EXISTS "message_reactions_user_id_idx" ON "message_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_author_id_idx" ON "messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_desc_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);