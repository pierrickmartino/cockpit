ALTER TABLE "actors" ADD COLUMN "status" text DEFAULT 'proposed' NOT NULL;--> statement-breakpoint
ALTER TABLE "flows" ADD COLUMN "status" text DEFAULT 'proposed' NOT NULL;