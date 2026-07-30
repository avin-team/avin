CREATE TYPE "public"."category_status" AS ENUM('ACTIVE', 'HIDDEN', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('SERVICE', 'COURSE');--> statement-breakpoint
CREATE TABLE "listing" (
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_amount" integer NOT NULL,
	"seller_id" text NOT NULL,
	"service_input_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"thumbnail_url" text,
	"title" text NOT NULL,
	"type" "listing_type" NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"warranty_duration_hours" integer NOT NULL,
	"warranty_terms" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_category" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "parent_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_category" (
	"commission_rate_percent" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"default_service_inputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_warranty_policy" jsonb NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"warranty_bounds" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_category_id_sub_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."sub_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_parent_id_parent_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_category_id_idx" ON "listing" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "listing_seller_id_idx" ON "listing" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "listing_status_idx" ON "listing" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listing_price_amount_idx" ON "listing" USING btree ("price_amount");--> statement-breakpoint
CREATE INDEX "listing_created_at_idx" ON "listing" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "parent_category_slug_idx" ON "parent_category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "parent_category_status_idx" ON "parent_category" USING btree ("status");--> statement-breakpoint
CREATE INDEX "parent_category_sort_order_idx" ON "parent_category" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_category_parent_slug_unique_idx" ON "sub_category" USING btree ("parent_id","slug");--> statement-breakpoint
CREATE INDEX "sub_category_parent_id_idx" ON "sub_category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "sub_category_status_idx" ON "sub_category" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sub_category_sort_order_idx" ON "sub_category" USING btree ("sort_order");