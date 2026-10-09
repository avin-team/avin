ALTER TABLE "order_item" DROP CONSTRAINT "order_item_quantity_one_check";--> statement-breakpoint
ALTER TABLE "cart_item" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_quantity_positive_check" CHECK ("cart_item"."quantity" >= 1);--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_quantity_positive_check" CHECK ("order_item"."quantity" >= 1);