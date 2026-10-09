CREATE TABLE "page_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"type" text NOT NULL,
	"variant" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"style" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"library_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "draft_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "header" jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "footer" jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "design_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_sections_page_id_idx" ON "page_sections" USING btree ("page_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "page_sections_page_section_unique" ON "page_sections" USING btree ("page_id","section_id");--> statement-breakpoint
CREATE INDEX "sections_site_id_idx" ON "sections" USING btree ("site_id");