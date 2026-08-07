CREATE TYPE "public"."dispute_evidence_submitter_role" AS ENUM('BUYER', 'SELLER');--> statement-breakpoint
ALTER TYPE "public"."dispute_status" ADD VALUE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."dispute_status" ADD VALUE 'RESOLVED_REFUNDED';--> statement-breakpoint
ALTER TYPE "public"."dispute_status" ADD VALUE 'RESOLVED_RELEASED';--> statement-breakpoint
CREATE TABLE "dispute_evidence" (
	"byte_size" integer,
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"dispute_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"submitted_by_user_id" text NOT NULL,
	"submitter_role" "dispute_evidence_submitter_role" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "previous_order_item_status" "order_item_status";--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "response_deadline_at" timestamp;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolved_by_user_id" text;--> statement-breakpoint
UPDATE "dispute"
SET
  "previous_order_item_status" = COALESCE(
    (
      SELECT "old_status"
      FROM "order_item_lifecycle_event"
      WHERE
        "order_item_lifecycle_event"."order_item_id" = "dispute"."order_item_id"
        AND "order_item_lifecycle_event"."new_status" = 'DISPUTED'
        AND "order_item_lifecycle_event"."effective_at" <= "dispute"."opened_at"
      ORDER BY "effective_at" DESC, "created_at" DESC, "id" DESC
      LIMIT 1
    ),
    'DISPUTED'
  ),
  "response_deadline_at" = "opened_at" + interval '48 hours'
WHERE "previous_order_item_status" IS NULL OR "response_deadline_at" IS NULL;--> statement-breakpoint
ALTER TABLE "dispute" ALTER COLUMN "previous_order_item_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute" ALTER COLUMN "response_deadline_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_dispute_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."dispute"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_evidence_dispute_submitted_idx" ON "dispute_evidence" USING btree ("dispute_id","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_evidence_storage_key_unique_idx" ON "dispute_evidence" USING btree ("storage_key");--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
