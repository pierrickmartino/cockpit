CREATE TABLE IF NOT EXISTS "published_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "published_snapshots_theme_version_unique" UNIQUE("theme_id","version")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "published_snapshots" ADD CONSTRAINT "published_snapshots_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
