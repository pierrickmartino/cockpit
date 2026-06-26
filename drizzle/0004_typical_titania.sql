ALTER TABLE "actors" ADD COLUMN "citations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "flows" ADD COLUMN "citations" jsonb DEFAULT '[]'::jsonb NOT NULL;