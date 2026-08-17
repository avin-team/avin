INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'advisor-attachments',
  'advisor-attachments',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
--> statement-breakpoint
CREATE TYPE "public"."advisor_attachment_status" AS ENUM('UPLOADED', 'COMMITTED');--> statement-breakpoint
CREATE TABLE "advisor_attachment" (
	"byte_size" integer NOT NULL,
	"committed_at" timestamp,
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"file_name" text NOT NULL,
	"height" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"session_id" uuid NOT NULL,
	"status" "advisor_attachment_status" DEFAULT 'UPLOADED' NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_attachment" ADD CONSTRAINT "advisor_attachment_message_id_advisor_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."advisor_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_attachment" ADD CONSTRAINT "advisor_attachment_session_id_advisor_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."advisor_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advisor_attachment_session_status_idx" ON "advisor_attachment" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "advisor_attachment_expires_at_idx" ON "advisor_attachment" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_attachment_storage_key_unique_idx" ON "advisor_attachment" USING btree ("storage_key");
