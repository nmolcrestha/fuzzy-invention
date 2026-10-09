CREATE TYPE "public"."site_status" AS ENUM('draft', 'live', 'offline');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text NOT NULL,
	"path" text NOT NULL,
	"is_home" boolean DEFAULT false NOT NULL,
	"show_in_nav" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"has_unpublished_changes" boolean DEFAULT true NOT NULL,
	"published_version_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"subdomain" text NOT NULL,
	"custom_domain" text,
	"template_key" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"navigation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "site_status" DEFAULT 'draft' NOT NULL,
	"design_has_unpublished_changes" boolean DEFAULT true NOT NULL,
	"published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sites_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "sites_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_site_created_idx" ON "activity_log" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "pages_site_id_idx" ON "pages" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_path_unique" ON "pages" USING btree ("site_id","path") WHERE "pages"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_home_unique" ON "pages" USING btree ("site_id") WHERE "pages"."is_home" and "pages"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "sites_owner_id_idx" ON "sites" USING btree ("owner_id");