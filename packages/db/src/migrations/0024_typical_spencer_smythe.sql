CREATE TYPE "public"."review_moderation_action" AS ENUM('HIDE', 'RESTORE');--> statement-breakpoint
CREATE TABLE "review" (
	"buyer_id" text NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hidden_at" timestamp,
	"hidden_by_user_id" text,
	"hidden_reason" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"listing_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"reviewer_masked_name" text NOT NULL,
	"seller_id" text NOT NULL,
	"service_package_name" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_rating_range_check" CHECK ("review"."rating" >= 1 AND "review"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "review_moderation_audit" (
	"action" "review_moderation_action" NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text NOT NULL,
	"review_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "completed_order_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "rating_score" numeric(3, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "completed_order_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "rating_score" numeric(3, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_hidden_by_user_id_user_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ADD CONSTRAINT "review_moderation_audit_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ADD CONSTRAINT "review_moderation_audit_review_id_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_order_item_unique_idx" ON "review" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "review_listing_id_idx" ON "review" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "review_seller_id_idx" ON "review" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "review_buyer_id_idx" ON "review" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "review_is_hidden_idx" ON "review" USING btree ("is_hidden");--> statement-breakpoint
CREATE INDEX "review_listing_created_idx" ON "review" USING btree ("listing_id","is_hidden","created_at");--> statement-breakpoint
CREATE INDEX "review_moderation_audit_review_idx" ON "review_moderation_audit" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_moderation_audit_actor_idx" ON "review_moderation_audit" USING btree ("actor_user_id");