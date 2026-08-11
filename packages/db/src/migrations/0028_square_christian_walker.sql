CREATE TYPE "public"."email_delivery_status" AS ENUM('pending', 'retrying', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "email_delivery" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"first_attempt_at" timestamp,
	"html_body" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_attempt_at" timestamp,
	"last_error" text,
	"next_attempt_at" timestamp,
	"recipient_email" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"retry_window_started_at" timestamp,
	"source_id" text NOT NULL,
	"source_type" text NOT NULL,
	"status" "email_delivery_status" DEFAULT 'pending' NOT NULL,
	"subject" text NOT NULL,
	"text_body" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_lifecycle_event_id_order_item_lifecycle_event_id_fk";
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_order_item_id_order_item_id_fk";
--> statement-breakpoint
DROP INDEX "notification_event_recipient_unique_idx";--> statement-breakpoint
DROP INDEX "notification_recipient_created_idx";--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "context" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "deep_link" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "event_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "source_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "source_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_event_recipient_channel_unique_idx" ON "email_delivery" USING btree ("event_type","source_type","source_id","recipient_user_id","channel");--> statement-breakpoint
CREATE INDEX "email_delivery_claim_idx" ON "email_delivery" USING btree ("status","next_attempt_at","claimed_at");--> statement-breakpoint
CREATE INDEX "email_delivery_created_at_idx" ON "email_delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_unread_idx" ON "notification" USING btree ("recipient_user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_recipient_unique_idx" ON "notification" USING btree ("event_type","source_type","source_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_user_id","created_at","id");--> statement-breakpoint
ALTER TABLE "notification" DROP COLUMN "lifecycle_event_id";--> statement-breakpoint
ALTER TABLE "notification" DROP COLUMN "order_item_id";