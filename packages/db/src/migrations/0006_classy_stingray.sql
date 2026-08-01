ALTER TABLE "listing" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "processing_time_hours" integer;