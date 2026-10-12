ALTER TABLE "media_assets" ADD COLUMN "kind" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "poster_url" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "duration_seconds" integer;