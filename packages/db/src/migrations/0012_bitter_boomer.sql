CREATE TYPE "public"."escrow_hold_status" AS ENUM('HELD', 'RELEASED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('AWAITING_SELLER', 'IN_PROGRESS', 'DELIVERED', 'IN_WARRANTY', 'COMPLETED', 'DISPUTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "cart" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"cart_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"purchase_transaction_id" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"total_amount" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "checkout_total_amount_positive_check" CHECK ("checkout"."total_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "escrow_hold" (
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"purchase_transaction_id" uuid NOT NULL,
	"status" "escrow_hold_status" DEFAULT 'HELD' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "escrow_hold_amount_positive_check" CHECK ("escrow_hold"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "order" (
	"buyer_id" text NOT NULL,
	"checkout_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" text NOT NULL,
	"total_amount" integer NOT NULL,
	CONSTRAINT "order_total_amount_positive_check" CHECK ("order"."total_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_custom_input" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"field_key" text NOT NULL,
	"field_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"commission_rate_percent" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"listing_snapshot" jsonb NOT NULL,
	"order_id" uuid NOT NULL,
	"price_amount" integer NOT NULL,
	"processing_deadline_at" timestamp NOT NULL,
	"processing_time_hours" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"service_input_fields" jsonb NOT NULL,
	"status" "order_item_status" DEFAULT 'AWAITING_SELLER' NOT NULL,
	"warranty_policy" jsonb NOT NULL,
	CONSTRAINT "order_item_price_positive_check" CHECK ("order_item"."price_amount" > 0),
	CONSTRAINT "order_item_quantity_one_check" CHECK ("order_item"."quantity" = 1),
	CONSTRAINT "order_item_processing_time_positive_check" CHECK ("order_item"."processing_time_hours" > 0)
);
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_purchase_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("purchase_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_hold" ADD CONSTRAINT "escrow_hold_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_hold" ADD CONSTRAINT "escrow_hold_purchase_transaction_id_ledger_transaction_id_fk" FOREIGN KEY ("purchase_transaction_id") REFERENCES "public"."ledger_transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_checkout_id_checkout_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkout"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_custom_input" ADD CONSTRAINT "order_custom_input_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_user_id_unique_idx" ON "cart" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_cart_listing_unique_idx" ON "cart_item" USING btree ("cart_id","listing_id");--> statement-breakpoint
CREATE INDEX "cart_item_cart_selected_idx" ON "cart_item" USING btree ("cart_id","selected");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_user_idempotency_key_unique_idx" ON "checkout" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_purchase_transaction_unique_idx" ON "checkout" USING btree ("purchase_transaction_id");--> statement-breakpoint
CREATE INDEX "checkout_user_created_at_idx" ON "checkout" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "escrow_hold_order_item_unique_idx" ON "escrow_hold" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "escrow_hold_transaction_idx" ON "escrow_hold" USING btree ("purchase_transaction_id");--> statement-breakpoint
CREATE INDEX "escrow_hold_status_idx" ON "escrow_hold" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "order_checkout_seller_unique_idx" ON "order" USING btree ("checkout_id","seller_id");--> statement-breakpoint
CREATE INDEX "order_buyer_created_at_idx" ON "order" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "order_seller_created_at_idx" ON "order" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_custom_input_item_key_unique_idx" ON "order_custom_input" USING btree ("order_item_id","field_key");--> statement-breakpoint
CREATE INDEX "order_custom_input_item_idx" ON "order_custom_input" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_item_order_id_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_item_listing_id_idx" ON "order_item" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "order_item_status_idx" ON "order_item" USING btree ("status");