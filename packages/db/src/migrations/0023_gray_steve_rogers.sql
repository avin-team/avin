CREATE TABLE "checkout_attachment_draft" (
	"byte_size" integer NOT NULL,
	"checkout_key" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_submission" ALTER COLUMN "delivery_note" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "buyer_description" text;--> statement-breakpoint
ALTER TABLE "checkout_attachment_draft" ADD CONSTRAINT "checkout_attachment_draft_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_attachment_draft" ADD CONSTRAINT "checkout_attachment_draft_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_attachment_draft_user_key_idx" ON "checkout_attachment_draft" USING btree ("user_id","checkout_key");--> statement-breakpoint
CREATE INDEX "checkout_attachment_draft_listing_idx" ON "checkout_attachment_draft" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_attachment_draft_storage_key_unique_idx" ON "checkout_attachment_draft" USING btree ("storage_key");