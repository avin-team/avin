ALTER TABLE "listing" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
UPDATE "listing" SET "status" = 'HIDDEN' WHERE "status" = 'SUSPENDED';--> statement-breakpoint
DROP TYPE "public"."listing_status";--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PUBLISHED', 'PAUSED', 'HIDDEN', 'ARCHIVED');--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."listing_status";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "status" SET DATA TYPE "public"."listing_status" USING "status"::"public"."listing_status";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "price_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "warranty_duration_hours" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "warranty_terms" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "listing" SET "slug" = 'listing-' || "id" WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "listing_slug_idx" ON "listing" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_slug_unique" UNIQUE("slug");
