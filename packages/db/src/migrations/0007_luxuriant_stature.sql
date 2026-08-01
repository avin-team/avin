ALTER TABLE "seller_profile" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "store_slug" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "seller_profile_store_slug_idx" ON "seller_profile" USING btree ("store_slug");