ALTER TABLE "shop" ADD COLUMN "draft_content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shop" ADD COLUMN "published_content" jsonb;--> statement-breakpoint
ALTER TABLE "shop" ADD COLUMN "published_at" timestamp with time zone;