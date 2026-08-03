CREATE TYPE "public"."service_package_status" AS ENUM('AVAILABLE', 'UNAVAILABLE');--> statement-breakpoint
CREATE TABLE "service_package" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"first_published_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_amount" integer NOT NULL,
	"processing_time_hours" integer NOT NULL,
	"scope" text NOT NULL,
	"service_input_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "service_package_status" DEFAULT 'AVAILABLE' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"warranty_policy" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_item" ADD COLUMN "service_package_id" uuid;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "service_package_id" uuid;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "service_package_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "service_package" ADD CONSTRAINT "service_package_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_package_listing_name_unique_idx" ON "service_package" USING btree ("listing_id","name");--> statement-breakpoint
CREATE INDEX "service_package_listing_id_idx" ON "service_package" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "service_package_listing_status_idx" ON "service_package" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "service_package_price_amount_idx" ON "service_package" USING btree ("price_amount");--> statement-breakpoint
INSERT INTO "service_package" (
	"listing_id",
	"name",
	"price_amount",
	"processing_time_hours",
	"scope",
	"service_input_fields",
	"status",
	"first_published_at",
	"warranty_policy"
)
SELECT
	"id",
	'Standard',
	"price_amount",
	"processing_time_hours",
	COALESCE(NULLIF(BTRIM("description"), ''), NULLIF(BTRIM("title"), ''), 'Standard service'),
	"service_input_fields",
	'AVAILABLE',
	CASE WHEN "status" <> 'DRAFT' THEN COALESCE("updated_at", "created_at") ELSE NULL END,
	CASE
		WHEN "warranty_duration_hours" IS NOT NULL
			AND "warranty_duration_hours" > 0
			AND NULLIF(BTRIM("warranty_terms"), '') IS NOT NULL
		THEN jsonb_build_object(
			'kind', 'TIMED',
			'durationHours', "warranty_duration_hours",
			'terms', BTRIM("warranty_terms")
		)
		ELSE jsonb_build_object('kind', 'NO_WARRANTY')
	END
FROM "listing"
WHERE "type" = 'SERVICE'
	AND "price_amount" IS NOT NULL
	AND "price_amount" > 0
	AND "processing_time_hours" IS NOT NULL
	AND "processing_time_hours" > 0;--> statement-breakpoint
UPDATE "cart_item" AS cart_item
SET "service_package_id" = package_item."id"
FROM "service_package" AS package_item
WHERE cart_item."listing_id" = package_item."listing_id"
	AND package_item."status" = 'AVAILABLE'
	AND (
		SELECT COUNT(*)
		FROM "service_package" AS available_package
		WHERE available_package."listing_id" = cart_item."listing_id"
			AND available_package."status" = 'AVAILABLE'
	) = 1;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_service_package_id_service_package_id_fk" FOREIGN KEY ("service_package_id") REFERENCES "public"."service_package"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_service_package_id_service_package_id_fk" FOREIGN KEY ("service_package_id") REFERENCES "public"."service_package"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_item_service_package_id_idx" ON "cart_item" USING btree ("service_package_id");--> statement-breakpoint
CREATE INDEX "order_item_service_package_id_idx" ON "order_item" USING btree ("service_package_id");
