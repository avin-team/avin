CREATE TYPE "public"."dispute_status" AS ENUM('OPEN');--> statement-breakpoint
CREATE TYPE "public"."order_item_actor_type" AS ENUM('BUYER', 'SELLER', 'ADMIN', 'SYSTEM');--> statement-breakpoint
CREATE TABLE "delivery_submission" (
	"command_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp NOT NULL,
	"delivery_note" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"seller_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute" (
	"buyer_id" text NOT NULL,
	"command_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opened_at" timestamp NOT NULL,
	"order_item_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'OPEN' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lifecycle_event_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"read_at" timestamp,
	"recipient_user_id" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_file" (
	"byte_size" integer,
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"delivery_submission_id" uuid,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid,
	"storage_key" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_lifecycle_event" (
	"actor_type" "order_item_actor_type" NOT NULL,
	"actor_user_id" text,
	"artifact_id" uuid,
	"artifact_type" text,
	"command_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"effective_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"new_status" "order_item_status" NOT NULL,
	"old_status" "order_item_status",
	"order_item_id" uuid NOT NULL,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "order_item" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_item" ALTER COLUMN "status" SET DEFAULT 'AWAITING_SELLER'::text;--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ALTER COLUMN "new_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ALTER COLUMN "old_status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "order_item" SET "status" = 'CLOSED' WHERE "status" = 'COMPLETED';--> statement-breakpoint
DROP TYPE "public"."order_item_status";--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('AWAITING_SELLER', 'IN_PROGRESS', 'DELIVERED', 'IN_WARRANTY', 'CLOSED', 'DISPUTED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
ALTER TABLE "order_item" ALTER COLUMN "status" SET DEFAULT 'AWAITING_SELLER'::"public"."order_item_status";--> statement-breakpoint
ALTER TABLE "order_item" ALTER COLUMN "status" SET DATA TYPE "public"."order_item_status" USING "status"::"public"."order_item_status";--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ALTER COLUMN "new_status" SET DATA TYPE "public"."order_item_status" USING "new_status"::"public"."order_item_status";--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ALTER COLUMN "old_status" SET DATA TYPE "public"."order_item_status" USING "old_status"::"public"."order_item_status";--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "delivery_review_deadline_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "disputed_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "warranty_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "warranty_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "delivery_submission" ADD CONSTRAINT "delivery_submission_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_submission" ADD CONSTRAINT "delivery_submission_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_lifecycle_event_id_order_item_lifecycle_event_id_fk" FOREIGN KEY ("lifecycle_event_id") REFERENCES "public"."order_item_lifecycle_event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_delivery_submission_id_delivery_submission_id_fk" FOREIGN KEY ("delivery_submission_id") REFERENCES "public"."delivery_submission"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ADD CONSTRAINT "order_item_lifecycle_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_lifecycle_event" ADD CONSTRAINT "order_item_lifecycle_event_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_submission_order_item_unique_idx" ON "delivery_submission" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_submission_item_command_unique_idx" ON "delivery_submission" USING btree ("order_item_id","command_key");--> statement-breakpoint
CREATE INDEX "delivery_submission_seller_idx" ON "delivery_submission" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_order_item_unique_idx" ON "dispute" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_item_command_unique_idx" ON "dispute" USING btree ("order_item_id","command_key");--> statement-breakpoint
CREATE INDEX "dispute_status_opened_idx" ON "dispute" USING btree ("status","opened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_recipient_unique_idx" ON "notification" USING btree ("lifecycle_event_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "order_file_order_idx" ON "order_file" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_file_order_item_idx" ON "order_file" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_file_delivery_submission_idx" ON "order_file" USING btree ("delivery_submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_file_storage_key_unique_idx" ON "order_file" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_item_lifecycle_event_item_command_unique_idx" ON "order_item_lifecycle_event" USING btree ("order_item_id","command_key");--> statement-breakpoint
CREATE INDEX "order_item_lifecycle_event_item_effective_idx" ON "order_item_lifecycle_event" USING btree ("order_item_id","effective_at");
