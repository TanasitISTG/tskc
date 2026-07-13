DROP INDEX "session_user_id_idx";--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");