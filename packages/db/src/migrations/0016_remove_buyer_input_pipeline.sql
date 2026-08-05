-- Custom SQL migration file, put your code below! --
UPDATE "order_item"
SET "service_package_snapshot" =
  "service_package_snapshot" - 'serviceInputFields' - 'service_input_fields'
WHERE "service_package_snapshot" ? 'serviceInputFields'
   OR "service_package_snapshot" ? 'service_input_fields';--> statement-breakpoint
DELETE FROM "order_custom_input";--> statement-breakpoint
DROP TABLE "order_custom_input";--> statement-breakpoint
ALTER TABLE "order_item" DROP COLUMN "service_input_fields";--> statement-breakpoint
ALTER TABLE "listing" DROP COLUMN "service_input_fields";--> statement-breakpoint
ALTER TABLE "sub_category" DROP COLUMN "default_service_inputs";
