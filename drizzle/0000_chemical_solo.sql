CREATE TABLE IF NOT EXISTS "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"state" text DEFAULT 'working' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
